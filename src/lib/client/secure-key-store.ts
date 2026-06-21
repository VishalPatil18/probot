// Hardened browser-side credential store.
//
// Replaces plain localStorage for any secret that should not be visible
// in DevTools as plaintext. Backed by IndexedDB + a non-extractable
// Web Crypto AES-256-GCM key.
//
// What this is good against:
//   ✓ Browser extensions / data exports that read storage casually -
//     they see ciphertext, not the API key.
//   ✓ Shoulder-surfing / screenshots of DevTools "Application" tab.
//   ✓ Stolen browser-data snapshots - the CryptoKey is marked
//     non-extractable so even a `structuredClone` on it can't get the
//     raw key material out, and the encrypted blob is useless without
//     it.
//
// What this is NOT good against:
//   ✗ Malicious JS on the same origin (XSS) - it can call decrypt()
//     via crypto.subtle and exfiltrate. We don't accept arbitrary
//     scripts on the origin so XSS is the residual risk.
//   ✗ Native browser extensions with full DOM access can still scrape
//     the decrypted value at runtime.
//
// The improvement is "raise the bar from `localStorage.getItem` to
// `subtle.decrypt`" - meaningful against casual storage inspection,
// not a silver bullet.

const DB_NAME = "probot-secure-store";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const CRYPTO_KEY_ID = "master.aes-gcm-256.v1";

// Each secret is stored under `secret.<name>` so multiple secrets can
// coexist (LLM key, embedding key, Azure creds blob) inside the same DB.
const SECRET_PREFIX = "secret.";

interface StoredCryptoKey {
  id: typeof CRYPTO_KEY_ID;
  cryptoKey: CryptoKey;
}

interface StoredSecret {
  id: string; // SECRET_PREFIX + logical name
  iv: ArrayBuffer; // 12 bytes
  ciphertext: ArrayBuffer;
}

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(KEY_STORE, mode);
        const store = transaction.objectStore(KEY_STORE);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  const existing = (await tx("readonly", (s) =>
    s.get(CRYPTO_KEY_ID) as IDBRequest<StoredCryptoKey | undefined>,
  )) as StoredCryptoKey | undefined;
  if (existing?.cryptoKey) return existing.cryptoKey;

  // CRITICAL: `extractable=false`. The browser will refuse to let JS
  // export the raw key bytes via crypto.subtle.exportKey(). The key
  // CAN still be used to encrypt / decrypt via subtle.crypto, which is
  // all the store needs to do. A future legitimate use case for
  // exporting (e.g., bulk migration) would have to be a deliberate
  // schema change, not an accidental leak.
  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    /* extractable */ false,
    ["encrypt", "decrypt"],
  );

  const row: StoredCryptoKey = { id: CRYPTO_KEY_ID, cryptoKey };
  await tx("readwrite", (s) => s.put(row));
  return cryptoKey;
}

function makeId(name: string): string {
  return `${SECRET_PREFIX}${name}`;
}

export interface SecureKeyStore {
  getSecret(name: string): Promise<string | null>;
  setSecret(name: string, value: string): Promise<void>;
  clearSecret(name: string): Promise<void>;
}

// Returns null when called server-side or on a browser without IDB +
// crypto.subtle (older Safari etc.). Callers should treat this the
// same as "no secret stored" and fall back gracefully.
export function getSecureKeyStore(): SecureKeyStore | null {
  if (!isBrowser()) return null;
  return {
    async getSecret(name: string): Promise<string | null> {
      try {
        const id = makeId(name);
        const row = (await tx("readonly", (s) =>
          s.get(id) as IDBRequest<StoredSecret | undefined>,
        )) as StoredSecret | undefined;
        if (!row) return null;
        const key = await getOrCreateMasterKey();
        const plaintext = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: row.iv },
          key,
          row.ciphertext,
        );
        return new TextDecoder().decode(plaintext);
      } catch {
        // Corrupted entry / decrypt failure - treat as missing so the
        // user can re-enter rather than getting stuck.
        return null;
      }
    },

    async setSecret(name: string, value: string): Promise<void> {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        await this.clearSecret(name);
        return;
      }
      const id = makeId(name);
      const key = await getOrCreateMasterKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(trimmed),
      );
      const row: StoredSecret = {
        id,
        iv: iv.buffer,
        ciphertext,
      };
      await tx("readwrite", (s) => s.put(row));
    },

    async clearSecret(name: string): Promise<void> {
      await tx("readwrite", (s) => s.delete(makeId(name)));
    },
  };
}

// Test helper - closes the cached DB handle (so `deleteDatabase` in the
// test setup isn't blocked by an open connection) and drops the cached
// promise so the next call re-opens.
export async function __resetSecureKeyStoreForTests(): Promise<void> {
  const current = dbPromise;
  dbPromise = null;
  if (current) {
    try {
      const db = await current;
      db.close();
    } catch {
      // ignore - we're just cleaning up
    }
  }
}

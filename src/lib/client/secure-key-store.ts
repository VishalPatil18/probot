const DB_NAME = "probot-secure-store";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const CRYPTO_KEY_ID = "master.aes-gcm-256.v1";

const SECRET_PREFIX = "secret.";

interface StoredCryptoKey {
  id: typeof CRYPTO_KEY_ID;
  cryptoKey: CryptoKey;
}

interface StoredSecret {
  id: string;
  iv: ArrayBuffer;
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

  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
 false,
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

export async function __resetSecureKeyStoreForTests(): Promise<void> {
  const current = dbPromise;
  dbPromise = null;
  if (current) {
    try {
      const db = await current;
      db.close();
    } catch {
    }
  }
}

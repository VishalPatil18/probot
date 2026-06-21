import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import {
  IV_LENGTH_BYTES,
  KEK_ENV_VAR,
  KEY_ALGORITHM,
  KEY_LENGTH_BYTES,
} from "./constants";

// Envelope encryption for the BYO-key managed path.
//
// Design (locked in - see claude/context.md Stage 7 Phase 3 entry):
//   1. KEK (Key Encryption Key) is a 32-byte symmetric key stored in the
//      `PROBOT_KEY_ENCRYPTION_KEY` env var (base64-encoded). Never lives in
//      the database, never in git, never in a backup of the database.
//   2. DEK (Data Encryption Key) is a fresh 32-byte random key per bot.
//      It encrypts the user's LLM API key with AES-256-GCM.
//   3. The DEK is itself encrypted with the KEK (AES-256-GCM) and stored
//      alongside the ciphertext in the database as `wrappedDek`.
//   4. At chat-time the route loads `{ciphertext, iv, authTag, wrappedDek,
//      dekIv, dekAuthTag}` from the DB, unwraps the DEK with the KEK,
//      decrypts the LLM key with the DEK, calls the provider, and discards
//      everything from in-memory state.
//
// Threat coverage:
//   ✓ DB dump leak / SQL injection / backup stolen → attacker has
//     ciphertext + wrappedDek but no KEK. Cannot decrypt.
//   ✓ Read-only DB query access → same as above.
//   ✓ App code access (read-only repo) → KEK isn't in code.
//   ✗ Full infra access (Vercel project owner) → can read KEK from env
//     vars. Self-host is the zero-trust escape hatch for that threat.
//   ✗ Compromise of the running Node process via RCE → process has KEK in
//     memory; attacker on the host could read it.
//
// String-zeroing limitation: Node JS strings are GC-managed and cannot be
// reliably wiped. Buffers can. The route decrypts into a Buffer, hands a
// short-lived string to the provider SDK, and lets V8's allocator reclaim
// it. Acceptable trade for the BYO-key use case; documented in CLAUDE.md.

export interface EnvelopePayload {
  ciphertext: string; // base64
  iv: string; // base64, 12 bytes
  authTag: string; // base64, 16 bytes
  wrappedDek: string; // base64 - DEK encrypted with KEK
  dekIv: string; // base64
  dekAuthTag: string; // base64
}

// ─────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────

interface EncryptedBuffer {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function encryptBuffer(plaintext: Buffer, key: Buffer): EncryptedBuffer {
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Encryption key must be exactly ${KEY_LENGTH_BYTES} bytes; got ${key.length}`,
    );
  }
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(KEY_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptBuffer(payload: EncryptedBuffer, key: Buffer): Buffer {
  const decipher = createDecipheriv(
    KEY_ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────
// KEK loading
// ─────────────────────────────────────────────────────────────────────────

function loadKekFromEnv(envValue: string | undefined): Buffer {
  if (!envValue) {
    throw new KekUnavailableError(
      `${KEK_ENV_VAR} is not set - managed-key storage is unavailable. ` +
        `Self-host operators who only support BYO-key-in-browser can ignore this; ` +
        `to enable the managed flow, set ${KEK_ENV_VAR} to a base64-encoded 32-byte key.`,
    );
  }
  const buf = Buffer.from(envValue, "base64");
  if (buf.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `${KEK_ENV_VAR} must decode to exactly ${KEY_LENGTH_BYTES} bytes ` +
        `(256-bit key, base64-encoded); got ${buf.length} bytes after decode.`,
    );
  }
  return buf;
}

// Distinct error class so route layers can downgrade "managed flow disabled"
// to a 503 with a useful message, rather than treating it as a generic 500.
export class KekUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KekUnavailableError";
  }
}

function getKek(): Buffer {
  // No caching: a fresh `Buffer.from(env, "base64")` is microseconds and
  // sidesteps the test-isolation traps that come with a module-level cache
  // when env vars change between tests.
  return loadKekFromEnv(process.env[KEK_ENV_VAR]);
}

// Hard-fail at module load IF the env var is set but malformed. Operators
// who don't use the managed flow leave it unset and skip this entirely.
// Operators who DO set it can't silently ship a broken value to production.
// (Skipped when running in a test runner so individual tests can manipulate
// the env var without crashing the test process at import time.)
if (
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true" &&
  process.env[KEK_ENV_VAR] !== undefined
) {
  loadKekFromEnv(process.env[KEK_ENV_VAR]);
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

export function encryptKey(plaintextLlmKey: string): EnvelopePayload {
  if (typeof plaintextLlmKey !== "string" || plaintextLlmKey.length === 0) {
    throw new Error("encryptKey: plaintext must be a non-empty string");
  }
  const kek = getKek();
  const dek = randomBytes(KEY_LENGTH_BYTES);
  try {
    const dataEnc = encryptBuffer(Buffer.from(plaintextLlmKey, "utf8"), dek);
    const wrappedEnc = encryptBuffer(dek, kek);
    return {
      ciphertext: dataEnc.ciphertext,
      iv: dataEnc.iv,
      authTag: dataEnc.authTag,
      wrappedDek: wrappedEnc.ciphertext,
      dekIv: wrappedEnc.iv,
      dekAuthTag: wrappedEnc.authTag,
    };
  } finally {
    // Zero the DEK before it leaves scope. The wrappedDek + the in-flight
    // ciphertext are what survive the function; the bare DEK does not.
    dek.fill(0);
  }
}

export function decryptKey(payload: EnvelopePayload): string {
  const kek = getKek();
  const dek = decryptBuffer(
    {
      ciphertext: payload.wrappedDek,
      iv: payload.dekIv,
      authTag: payload.dekAuthTag,
    },
    kek,
  );
  try {
    const plaintextBuf = decryptBuffer(payload, dek);
    try {
      return plaintextBuf.toString("utf8");
    } finally {
      // Buffer can be zeroed; the returned string cannot (GC-managed). The
      // caller is responsible for not holding the returned string longer
      // than the duration of one provider request.
      plaintextBuf.fill(0);
    }
  } finally {
    dek.fill(0);
  }
}

// Quarterly KEK rotation utility. Operator deploys with both PROBOT_KEY_
// ENCRYPTION_KEY (old) and PROBOT_KEY_ENCRYPTION_KEY_NEXT (new) set, runs
// this once over every stored EnvelopePayload, then flips the env so NEXT
// becomes the current KEK and the old one is removed.
//
// Why re-wrap instead of re-encrypt: re-encrypting would invalidate every
// existing payload's `{ciphertext, iv, authTag}` and require touching every
// piece of every payload. Re-wrapping ONLY rewrites the wrappedDek with the
// new KEK; the data ciphertext/iv/authTag stay byte-identical. That means
// rotation is one UPDATE per row with no provider re-calls needed.
//
// Caller responsibilities:
//   - Reads `oldKekBase64` and `newKekBase64` from the operator-controlled
//     environment (not this module).
//   - Persists the rotated payloads back to the DB.
//   - Updates the env so the new KEK becomes `PROBOT_KEY_ENCRYPTION_KEY`.
export function rotateKEK(
  payloads: EnvelopePayload[],
  oldKekBase64: string,
  newKekBase64: string,
): EnvelopePayload[] {
  const oldKek = loadKekFromEnv(oldKekBase64);
  const newKek = loadKekFromEnv(newKekBase64);
  return payloads.map((payload) => {
    const dek = decryptBuffer(
      {
        ciphertext: payload.wrappedDek,
        iv: payload.dekIv,
        authTag: payload.dekAuthTag,
      },
      oldKek,
    );
    try {
      const rewrapped = encryptBuffer(dek, newKek);
      return {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
        wrappedDek: rewrapped.ciphertext,
        dekIv: rewrapped.iv,
        dekAuthTag: rewrapped.authTag,
      };
    } finally {
      dek.fill(0);
    }
  });
}

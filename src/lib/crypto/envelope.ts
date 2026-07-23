import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import {
  IV_LENGTH_BYTES,
  KEK_ENV_VAR,
  KEY_ALGORITHM,
  KEY_LENGTH_BYTES,
} from "./constants";

export interface EnvelopePayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedDek: string;
  dekIv: string;
  dekAuthTag: string;
}

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

export class KekUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KekUnavailableError";
  }
}

function getKek(): Buffer {
  return loadKekFromEnv(process.env[KEK_ENV_VAR]);
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true" &&
  process.env[KEK_ENV_VAR] !== undefined
) {
  loadKekFromEnv(process.env[KEK_ENV_VAR]);
}

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
      plaintextBuf.fill(0);
    }
  } finally {
    dek.fill(0);
  }
}

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

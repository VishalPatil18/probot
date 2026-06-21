import { randomBytes } from "crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KEK_ENV_VAR } from "./constants";
import {
  KekUnavailableError,
  decryptKey,
  encryptKey,
  rotateKEK,
} from "./envelope";

function fakeKekBase64(): string {
  return randomBytes(32).toString("base64");
}

describe("envelope encryption", () => {
  const originalKek = process.env[KEK_ENV_VAR];

  beforeEach(() => {
    process.env[KEK_ENV_VAR] = fakeKekBase64();
  });

  afterEach(() => {
    if (originalKek === undefined) {
      delete process.env[KEK_ENV_VAR];
    } else {
      process.env[KEK_ENV_VAR] = originalKek;
    }
  });

  describe("encryptKey + decryptKey", () => {
    it("round-trips a plaintext through encrypt → decrypt", () => {
      const plaintext = "sk-ant-api03-LIVE-EXAMPLE-KEY-DO-NOT-USE";
      const payload = encryptKey(plaintext);
      expect(decryptKey(payload)).toBe(plaintext);
    });

    it("emits ciphertext that differs from plaintext", () => {
      const plaintext = "sk-test";
      const payload = encryptKey(plaintext);
      expect(payload.ciphertext).not.toContain(plaintext);
      expect(
        Buffer.from(payload.ciphertext, "base64").toString("utf8"),
      ).not.toBe(plaintext);
    });

    it("produces non-deterministic ciphertext for the same plaintext (fresh IV per encrypt)", () => {
      const plaintext = "sk-test";
      const a = encryptKey(plaintext);
      const b = encryptKey(plaintext);
      expect(a.ciphertext).not.toBe(b.ciphertext);
      expect(a.iv).not.toBe(b.iv);
      expect(a.wrappedDek).not.toBe(b.wrappedDek);
    });

    it("rejects payloads that have been tampered with (GCM auth tag check)", () => {
      const payload = encryptKey("sk-test");
      // Flip a bit in the ciphertext.
      const tamperedBuf = Buffer.from(payload.ciphertext, "base64");
      tamperedBuf[0] = (tamperedBuf[0] ?? 0) ^ 0x01;
      const tampered = {
        ...payload,
        ciphertext: tamperedBuf.toString("base64"),
      };
      expect(() => decryptKey(tampered)).toThrow();
    });

    it("rejects payloads decrypted with a different KEK", () => {
      const payload = encryptKey("sk-test");
      // Rotate the KEK in the env, then attempt to decrypt with the new KEK.
      process.env[KEK_ENV_VAR] = fakeKekBase64();
      expect(() => decryptKey(payload)).toThrow();
    });

    it("throws KekUnavailableError when KEK env var is missing", () => {
      delete process.env[KEK_ENV_VAR];
      expect(() => encryptKey("sk-test")).toThrow(KekUnavailableError);
    });

    it("throws when KEK env var decodes to the wrong length", () => {
      // 16 bytes, not 32 - AES-128 key incorrectly stuffed where AES-256
      // is required.
      process.env[KEK_ENV_VAR] = randomBytes(16).toString("base64");
      expect(() => encryptKey("sk-test")).toThrow(/32 bytes/);
    });

    it("rejects empty plaintext", () => {
      expect(() => encryptKey("")).toThrow(/non-empty/);
    });

    it("handles very long plaintexts (10 KB) round-trip", () => {
      const long = "x".repeat(10_000);
      expect(decryptKey(encryptKey(long))).toBe(long);
    });

    it("handles non-ASCII plaintext (unicode round-trip)", () => {
      const plaintext = "sk-ant-🔑-日本語-key-✨";
      expect(decryptKey(encryptKey(plaintext))).toBe(plaintext);
    });
  });

  describe("rotateKEK", () => {
    it("re-wraps each payload so the OLD KEK no longer decrypts it", () => {
      const oldKek = fakeKekBase64();
      const newKek = fakeKekBase64();
      process.env[KEK_ENV_VAR] = oldKek;
      const originals = [
        encryptKey("sk-a"),
        encryptKey("sk-b"),
        encryptKey("sk-c"),
      ];
      const rotated = rotateKEK(originals, oldKek, newKek);

      // Old KEK can NO LONGER decrypt the rotated payloads.
      process.env[KEK_ENV_VAR] = oldKek;
      expect(() => decryptKey(rotated[0]!)).toThrow();

      // New KEK CAN decrypt them, and the plaintext is unchanged.
      process.env[KEK_ENV_VAR] = newKek;
      expect(decryptKey(rotated[0]!)).toBe("sk-a");
      expect(decryptKey(rotated[1]!)).toBe("sk-b");
      expect(decryptKey(rotated[2]!)).toBe("sk-c");
    });

    it("preserves the data ciphertext byte-for-byte (only wrappedDek changes)", () => {
      const oldKek = fakeKekBase64();
      const newKek = fakeKekBase64();
      process.env[KEK_ENV_VAR] = oldKek;
      const original = encryptKey("sk-test");
      const [rotated] = rotateKEK([original], oldKek, newKek);

      expect(rotated!.ciphertext).toBe(original.ciphertext);
      expect(rotated!.iv).toBe(original.iv);
      expect(rotated!.authTag).toBe(original.authTag);
      // The DEK wrapping changes since it's now encrypted under the new KEK.
      expect(rotated!.wrappedDek).not.toBe(original.wrappedDek);
    });

    it("returns an empty array when given an empty input", () => {
      const oldKek = fakeKekBase64();
      const newKek = fakeKekBase64();
      expect(rotateKEK([], oldKek, newKek)).toEqual([]);
    });
  });
});

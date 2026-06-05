import { describe, expect, it } from "vitest";

import { KeyTransportError, readApiKey, redactKey } from "./key-transport";

const HEADER = "x-llm-api-key";
const VALID_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789";

function headersWith(value: string | null): Headers {
  const h = new Headers();
  if (value !== null) h.set(HEADER, value);
  return h;
}

describe("readApiKey", () => {
  it("returns the trimmed header value when present and well-formed", () => {
    const result = readApiKey(headersWith(`  ${VALID_KEY}  `));
    expect(result).toBe(VALID_KEY);
  });

  it("throws KeyTransportError(missing) when the header is absent", () => {
    expect(() => readApiKey(headersWith(null))).toThrow(KeyTransportError);
    try {
      readApiKey(headersWith(null));
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("missing");
    }
  });

  it("throws KeyTransportError(empty) when the header is empty or whitespace-only", () => {
    for (const value of ["", "   ", "\t\n"]) {
      try {
        readApiKey(headersWith(value));
        throw new Error(`expected throw for value: ${JSON.stringify(value)}`);
      } catch (err) {
        expect(err).toBeInstanceOf(KeyTransportError);
        expect((err as KeyTransportError).reason).toBe("empty");
      }
    }
  });

  it("throws KeyTransportError(too_short) for keys shorter than the minimum length", () => {
    try {
      readApiKey(headersWith("short"));
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("too_short");
    }
  });

  it("throws KeyTransportError(too_long) when the header value exceeds the cap", () => {
    const oversized = "a".repeat(300);
    try {
      readApiKey(headersWith(oversized));
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("too_long");
    }
  });

  it("never includes the key value in the error message", () => {
    const distinctiveKey = "sk-ant-DETECTABLE-SECRET-MARKER-XYZ-987654321";
    const oversized = `${distinctiveKey}${"a".repeat(300)}`;
    try {
      readApiKey(headersWith(oversized));
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain("DETECTABLE-SECRET-MARKER");
      expect(message).not.toContain(distinctiveKey);
    }
  });
});

describe("redactKey", () => {
  it("masks keys at or under 8 characters as ***", () => {
    expect(redactKey("short")).toBe("***");
    expect(redactKey("12345678")).toBe("***");
  });

  it("shows only first 4 + last 4 chars for longer keys", () => {
    expect(redactKey("sk-ant-api03-abcdefghijklmnop")).toBe("sk-a...mnop");
  });

  it("does not throw on empty input", () => {
    expect(redactKey("")).toBe("***");
  });
});

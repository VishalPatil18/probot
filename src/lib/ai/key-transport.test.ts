import { describe, expect, it } from "vitest";

import {
  KeyTransportError,
  readApiKey,
  readAzureCreds,
  readOllamaBaseUrl,
  redactKey,
} from "./key-transport";

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

describe("readAzureCreds", () => {
  function azureHeaders(opts: {
    endpoint?: string | null;
    apiVersion?: string | null;
  }): Headers {
    const h = new Headers();
    if (opts.endpoint !== null && opts.endpoint !== undefined) {
      h.set("x-llm-azure-endpoint", opts.endpoint);
    }
    if (opts.apiVersion !== null && opts.apiVersion !== undefined) {
      h.set("x-llm-azure-api-version", opts.apiVersion);
    }
    return h;
  }

  it("returns null when no endpoint header is present", () => {
    expect(readAzureCreds(azureHeaders({}))).toBeNull();
  });

  it("returns endpoint + apiVersion when both headers are present", () => {
    const result = readAzureCreds(
      azureHeaders({
        endpoint: "https://example.cognitiveservices.azure.com",
        apiVersion: "2025-01-01-preview",
      }),
    );
    expect(result).toEqual({
      endpoint: "https://example.cognitiveservices.azure.com",
      apiVersion: "2025-01-01-preview",
    });
  });

  it("returns apiVersion=null when only endpoint is present", () => {
    const result = readAzureCreds(
      azureHeaders({ endpoint: "https://example.cognitiveservices.azure.com" }),
    );
    expect(result).toEqual({
      endpoint: "https://example.cognitiveservices.azure.com",
      apiVersion: null,
    });
  });

  it("trims surrounding whitespace from endpoint", () => {
    const result = readAzureCreds(
      azureHeaders({
        endpoint: "  https://example.cognitiveservices.azure.com  ",
      }),
    );
    expect(result?.endpoint).toBe(
      "https://example.cognitiveservices.azure.com",
    );
  });

  it("throws invalid_endpoint when endpoint is empty/whitespace", () => {
    try {
      readAzureCreds(azureHeaders({ endpoint: "   " }));
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("invalid_endpoint");
    }
  });

  it("throws invalid_endpoint when endpoint exceeds the length cap", () => {
    try {
      readAzureCreds(azureHeaders({ endpoint: `https://${"a".repeat(600)}` }));
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("invalid_endpoint");
    }
  });

  it("throws invalid_endpoint when endpoint is not HTTPS", () => {
    try {
      readAzureCreds(
        azureHeaders({ endpoint: "http://example.cognitiveservices.azure.com" }),
      );
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(KeyTransportError);
      expect((err as KeyTransportError).reason).toBe("invalid_endpoint");
    }
  });

  it("treats a malformed apiVersion as absent (null) without throwing", () => {
    const result = readAzureCreds(
      azureHeaders({
        endpoint: "https://example.cognitiveservices.azure.com",
        apiVersion: "",
      }),
    );
    expect(result?.apiVersion).toBeNull();
  });

  it("never includes the raw endpoint value in a thrown error message", () => {
    const canary = "https://LEAK-CANARY-ENDPOINT-1234567890" + "a".repeat(600);
    try {
      readAzureCreds(azureHeaders({ endpoint: canary }));
    } catch (err) {
      expect((err as Error).message).not.toContain("LEAK-CANARY-ENDPOINT");
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

describe("readOllamaBaseUrl", () => {
  const OLLAMA_HEADER = "x-llm-ollama-base-url";

  function ollamaHeaders(value: string | null): Headers {
    const h = new Headers();
    if (value !== null) h.set(OLLAMA_HEADER, value);
    return h;
  }

  it("returns null when the header is absent (not fatal at this layer)", () => {
    expect(readOllamaBaseUrl(ollamaHeaders(null))).toBeNull();
  });

  it("accepts a localhost http URL", () => {
    expect(readOllamaBaseUrl(ollamaHeaders("http://localhost:11434"))).toBe(
      "http://localhost:11434",
    );
  });

  it("accepts a loopback IP http URL", () => {
    expect(readOllamaBaseUrl(ollamaHeaders("http://127.0.0.1:11434"))).toBe(
      "http://127.0.0.1:11434",
    );
  });

  it("accepts a remote https URL", () => {
    expect(readOllamaBaseUrl(ollamaHeaders("https://ollama.example.com"))).toBe(
      "https://ollama.example.com",
    );
  });

  it("rejects a non-loopback http URL", () => {
    expect(() =>
      readOllamaBaseUrl(ollamaHeaders("http://ollama.example.com")),
    ).toThrow(KeyTransportError);
  });

  it("rejects a malformed URL", () => {
    expect(() => readOllamaBaseUrl(ollamaHeaders("not-a-url"))).toThrow(
      KeyTransportError,
    );
  });

  it("rejects an empty header value", () => {
    expect(() => readOllamaBaseUrl(ollamaHeaders("   "))).toThrow(
      KeyTransportError,
    );
  });
});

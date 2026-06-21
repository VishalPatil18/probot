import { describe, expect, it } from "vitest";

import { redactSensitive } from "./redact";

describe("redactSensitive", () => {
  it("returns primitives unchanged", () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive("hello")).toBe("hello");
    expect(redactSensitive(false)).toBe(false);
  });

  it("redacts sensitive header values when given a Headers object", () => {
    const headers = new Headers();
    headers.set("x-llm-api-key", "sk-secret-key-12345");
    headers.set("content-type", "application/json");
    headers.set("authorization", "Bearer abc");
    headers.set("x-preview-token", "preview-token-value");
    headers.set("x-embedding-api-key", "sk-embed-key");
    headers.set("x-llm-azure-endpoint", "https://acme.openai.azure.com");

    const redacted = redactSensitive(headers) as Record<string, string>;
    expect(redacted["content-type"]).toBe("application/json");
    expect(redacted["x-llm-api-key"]).toBe("[REDACTED]");
    expect(redacted["authorization"]).toBe("[REDACTED]");
    expect(redacted["x-preview-token"]).toBe("[REDACTED]");
    expect(redacted["x-embedding-api-key"]).toBe("[REDACTED]");
    expect(redacted["x-llm-azure-endpoint"]).toBe("[REDACTED]");
  });

  it("redacts sensitive property names in nested objects", () => {
    const input = {
      user: { id: "u1", apiKey: "sk-leak" },
      request: { headers: { authorization: "Bearer x" } },
      stack: "some/path",
    };
    const redacted = redactSensitive(input) as Record<string, unknown>;
    expect((redacted.user as Record<string, unknown>).apiKey).toBe(
      "[REDACTED]",
    );
    expect((redacted.user as Record<string, unknown>).id).toBe("u1");
    expect(
      ((redacted.request as Record<string, unknown>).headers as Record<
        string,
        unknown
      >).authorization,
    ).toBe("[REDACTED]");
    expect(redacted.stack).toBe("some/path");
  });

  it("redacts case-insensitively on property names", () => {
    const input = { APIKEY: "x", Password: "y", SECRET: "z" };
    const redacted = redactSensitive(input) as Record<string, unknown>;
    expect(redacted.APIKEY).toBe("[REDACTED]");
    expect(redacted.Password).toBe("[REDACTED]");
    expect(redacted.SECRET).toBe("[REDACTED]");
  });

  it("handles arrays of nested objects", () => {
    const input = [
      { apiKey: "leak" },
      { otherField: "fine", apiKey: "also-leak" },
    ];
    const redacted = redactSensitive(input) as Record<string, unknown>[];
    expect(redacted[0]?.apiKey).toBe("[REDACTED]");
    expect(redacted[1]?.otherField).toBe("fine");
    expect(redacted[1]?.apiKey).toBe("[REDACTED]");
  });

  it("does not infinite-loop on circular references", () => {
    const a: Record<string, unknown> = { name: "a", apiKey: "x" };
    const b: Record<string, unknown> = { name: "b", parent: a };
    a.child = b;
    const redacted = redactSensitive(a) as Record<string, unknown>;
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect(
      ((redacted.child as Record<string, unknown>).parent as unknown),
    ).toBe("[Circular]");
  });
});

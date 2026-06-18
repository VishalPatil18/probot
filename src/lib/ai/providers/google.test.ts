import { describe, expect, it } from "vitest";

import { googleProvider } from "./google";
import { ProviderError } from "./types";

describe("googleProvider (stub)", () => {
  it("exposes a defaultModel string", () => {
    expect(typeof googleProvider.defaultModel).toBe("string");
    expect(googleProvider.defaultModel.length).toBeGreaterThan(0);
  });

  it("throws ProviderError(google, unknown) when complete() is called", async () => {
    await expect(
      googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-fake-key-for-test",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "google",
      category: "unknown",
    });
  });

  it("does not include the apiKey in the error message", async () => {
    const distinctiveKey = "sk-FAKE-LEAK-CANARY-1234567890";
    try {
      await googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: distinctiveKey,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as Error).message).not.toContain(distinctiveKey);
    }
  });
});

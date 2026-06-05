import { describe, expect, it } from "vitest";

import { deepseekProvider } from "./deepseek";
import { ProviderError } from "./types";

describe("deepseekProvider (stub)", () => {
  it("exposes a defaultModel string", () => {
    expect(typeof deepseekProvider.defaultModel).toBe("string");
    expect(deepseekProvider.defaultModel.length).toBeGreaterThan(0);
  });

  it("throws ProviderError(deepseek, unknown) when complete() is called", async () => {
    await expect(
      deepseekProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-fake-key-for-test",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "deepseek",
      category: "unknown",
    });
  });

  it("does not include the apiKey in the error message", async () => {
    const distinctiveKey = "sk-FAKE-LEAK-CANARY-1234567890";
    try {
      await deepseekProvider.complete({
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

import { afterEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const getGenerativeModelMock = vi.fn(() => ({
  generateContent: generateContentMock,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

import { googleProvider } from "./google";
import { ProviderError } from "./types";

describe("googleProvider", () => {
  afterEach(() => {
    generateContentMock.mockReset();
    getGenerativeModelMock.mockClear();
  });

  it("exposes a defaultModel string", () => {
    expect(typeof googleProvider.defaultModel).toBe("string");
    expect(googleProvider.defaultModel.length).toBeGreaterThan(0);
  });

  it("returns the model's text reply on a successful call", async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => "Jane is great at ML." },
    });
    const result = await googleProvider.complete({
      system: "You are a helpful assistant",
      userMessage: "Tell me about Jane",
      apiKey: "AIzaSy-fake-key-for-test",
    });
    expect(result).toEqual({ reply: "Jane is great at ML." });
  });

  it("plumbs system + generationConfig through to getGenerativeModel", async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => "ok" },
    });
    await googleProvider.complete({
      system: "SYSTEM_PROMPT_MARKER",
      userMessage: "hi",
      apiKey: "AIzaSy-fake",
      maxTokens: 123,
      temperature: 0.42,
      model: "gemini-2.5-pro",
    });
    expect(getGenerativeModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-pro",
        systemInstruction: "SYSTEM_PROMPT_MARKER",
        generationConfig: expect.objectContaining({
          maxOutputTokens: 123,
          temperature: 0.42,
        }),
      }),
    );
  });

  it("throws ProviderError(invalid_key) on a 401-shaped SDK error", async () => {
    generateContentMock.mockRejectedValueOnce(
      new Error("[GoogleGenerativeAI Error]: API key not valid. Please pass a valid API key."),
    );
    await expect(
      googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "AIzaSy-bad",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "google",
      category: "invalid_key",
    });
  });

  it("throws ProviderError(rate_limit) on a 429-shaped SDK error", async () => {
    generateContentMock.mockRejectedValueOnce(
      new Error("Got status: 429 RESOURCE_EXHAUSTED"),
    );
    await expect(
      googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "AIzaSy-ok",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "google",
      category: "rate_limit",
    });
  });

  it("throws ProviderError(unknown) on any other SDK error", async () => {
    generateContentMock.mockRejectedValueOnce(new Error("Network unreachable"));
    await expect(
      googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "AIzaSy-ok",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "google",
      category: "unknown",
    });
  });

  it("throws ProviderError(unknown) when the SDK returns empty text", async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => "" },
    });
    await expect(
      googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "AIzaSy-ok",
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      provider: "google",
      category: "unknown",
    });
  });

  it("does not include the apiKey in the error message", async () => {
    const distinctiveKey = "AIzaSy-FAKE-LEAK-CANARY-1234567890";
    generateContentMock.mockRejectedValueOnce(new Error("something broke"));
    try {
      await googleProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: distinctiveKey,
      });
      throw new Error("expected ProviderError");
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as Error).message).not.toContain(distinctiveKey);
    }
  });
});

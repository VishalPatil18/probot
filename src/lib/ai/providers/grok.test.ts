import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("openai", async () => {
  const actual = await vi.importActual<typeof import("openai")>("openai");

  class MockOpenAI {
    chat: { completions: { create: typeof createMock } };
    constructor(opts: { apiKey: string; baseURL?: string }) {
      constructorMock(opts);
      this.chat = { completions: { create: createMock } };
    }
  }

  return {
    ...actual,
    default: MockOpenAI,
  };
});

import { grokProvider } from "./grok";
import { ProviderError } from "./types";

const OpenAI = await import("openai");

function chatResponse(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
  };
}

describe("grokProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultModel", () => {
    expect(grokProvider.defaultModel).toBe("grok-4.3");
  });

  it("points the OpenAI SDK at the xAI base URL with the per-request key", async () => {
    createMock.mockResolvedValueOnce(chatResponse("hello"));
    await grokProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "xai-test-XYZ-1234567890",
    });
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "xai-test-XYZ-1234567890",
      baseURL: "https://api.x.ai/v1",
    });
  });

  it("returns the assistant text from the first choice", async () => {
    createMock.mockResolvedValueOnce(chatResponse("the answer"));
    const result = await grokProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "xai-test-XYZ-1234567890",
      model: "grok-4.3",
    });
    expect(result).toEqual({ reply: "the answer" });
  });

  it("maps 401 to category=invalid_key without leaking the key", async () => {
    const err = new OpenAI.AuthenticationError(
      401,
      { message: "bad key" },
      "Unauthorized",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await grokProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "xai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).provider).toBe("grok");
      expect((caught as ProviderError).category).toBe("invalid_key");
      expect((caught as Error).message).not.toContain("xai-leak-canary");
    }
  });

  it("maps 429 to category=rate_limit", async () => {
    const err = new OpenAI.RateLimitError(
      429,
      { message: "slow down" },
      "Too Many Requests",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await grokProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "xai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect((caught as ProviderError).category).toBe("rate_limit");
    }
  });

  it("maps an unknown SDK error to category=unknown", async () => {
    createMock.mockRejectedValueOnce(new Error("network blew up"));
    try {
      await grokProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "xai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect((caught as ProviderError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("network blew up");
    }
  });
});

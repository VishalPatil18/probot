import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("openai", async () => {
  const actual = await vi.importActual<typeof import("openai")>("openai");

  class MockOpenAI {
    chat: { completions: { create: typeof createMock } };
    constructor(opts: { apiKey: string }) {
      constructorMock(opts);
      this.chat = { completions: { create: createMock } };
    }
  }

  return {
    ...actual,
    default: MockOpenAI,
  };
});

import { openaiProvider } from "./openai";
import { ProviderError } from "./types";

const OpenAI = await import("openai");

function chatResponse(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
  };
}

describe("openaiProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultModel", () => {
    expect(openaiProvider.defaultModel).toBe("gpt-4o-mini");
  });

  it("constructs the SDK client with the per-request apiKey", async () => {
    createMock.mockResolvedValueOnce(chatResponse("hello"));
    await openaiProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
  });

  it("sends system + user messages in the expected shape", async () => {
    createMock.mockResolvedValueOnce(chatResponse("response"));
    await openaiProvider.complete({
      system: "you are a bot",
      userMessage: "hello there",
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          { role: "system", content: "you are a bot" },
          { role: "user", content: "hello there" },
        ],
      }),
    );
  });

  it("honors caller-supplied model / maxTokens / temperature overrides", async () => {
    createMock.mockResolvedValueOnce(chatResponse("response"));
    await openaiProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-openai-test-XYZ-1234567890",
      model: "gpt-4o",
      maxTokens: 1024,
      temperature: 0.7,
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        max_tokens: 1024,
        temperature: 0.7,
      }),
    );
  });

  it("returns the assistant text from the first choice", async () => {
    createMock.mockResolvedValueOnce(chatResponse("the answer"));
    const result = await openaiProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(result).toEqual({ reply: "the answer" });
  });

  it("maps 401 AuthenticationError to category=invalid_key", async () => {
    const err = new OpenAI.AuthenticationError(
      401,
      { message: "bad key" },
      "Unauthorized",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await openaiProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).provider).toBe("openai");
      expect((caught as ProviderError).category).toBe("invalid_key");
      expect((caught as Error).message).not.toContain("sk-openai-leak-canary");
    }
  });

  it("maps 429 RateLimitError to category=rate_limit", async () => {
    const err = new OpenAI.RateLimitError(
      429,
      { message: "slow down" },
      "Too Many Requests",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await openaiProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("rate_limit");
      expect((caught as Error).message).not.toContain("sk-openai-leak-canary");
    }
  });

  it("maps an unknown SDK error to category=unknown", async () => {
    createMock.mockRejectedValueOnce(new Error("network blew up"));
    try {
      await openaiProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("sk-openai-leak-canary");
      expect((caught as Error).message).not.toContain("network blew up");
    }
  });

  it("maps a missing message content to category=unknown", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: null, role: "assistant" } }],
    });
    try {
      await openaiProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-openai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
    }
  });
});

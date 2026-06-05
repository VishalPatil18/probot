import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("@anthropic-ai/sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@anthropic-ai/sdk")>(
      "@anthropic-ai/sdk",
    );

  class MockAnthropic {
    messages: { create: typeof createMock };
    constructor(opts: { apiKey: string }) {
      constructorMock(opts);
      this.messages = { create: createMock };
    }
  }

  return {
    ...actual,
    default: MockAnthropic,
  };
});

import { anthropicProvider } from "./anthropic";
import { ProviderError } from "./types";

const Anthropic = await import("@anthropic-ai/sdk");

function textBlockResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

describe("anthropicProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultModel", () => {
    expect(anthropicProvider.defaultModel).toBe("claude-haiku-4-5");
  });

  it("constructs the SDK client with the per-request apiKey", async () => {
    createMock.mockResolvedValueOnce(textBlockResponse("hello"));
    await anthropicProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-ant-test-XYZ-1234567890",
    });
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "sk-ant-test-XYZ-1234567890",
    });
  });

  it("sends a single user message with the system prompt at the top level", async () => {
    createMock.mockResolvedValueOnce(textBlockResponse("response"));
    await anthropicProvider.complete({
      system: "you are a bot",
      userMessage: "hello there",
      apiKey: "sk-ant-test-XYZ-1234567890",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        temperature: 0.3,
        system: "you are a bot",
        messages: [{ role: "user", content: "hello there" }],
      }),
    );
  });

  it("honors caller-supplied model / maxTokens / temperature overrides", async () => {
    createMock.mockResolvedValueOnce(textBlockResponse("response"));
    await anthropicProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-ant-test-XYZ-1234567890",
      model: "claude-3-5-sonnet-latest",
      maxTokens: 1024,
      temperature: 0.7,
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        temperature: 0.7,
      }),
    );
  });

  it("returns the text from the first content block", async () => {
    createMock.mockResolvedValueOnce(textBlockResponse("the answer"));
    const result = await anthropicProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "sk-ant-test-XYZ-1234567890",
    });
    expect(result).toEqual({ reply: "the answer" });
  });

  it("maps 401 AuthenticationError to category=invalid_key", async () => {
    const err = new Anthropic.AuthenticationError(
      401,
      { message: "bad key" },
      "Unauthorized",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await anthropicProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-ant-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).provider).toBe("anthropic");
      expect((caught as ProviderError).category).toBe("invalid_key");
      expect((caught as Error).message).not.toContain("sk-ant-leak-canary");
    }
  });

  it("maps 429 RateLimitError to category=rate_limit", async () => {
    const err = new Anthropic.RateLimitError(
      429,
      { message: "slow down" },
      "Too Many Requests",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await anthropicProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-ant-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("rate_limit");
      expect((caught as Error).message).not.toContain("sk-ant-leak-canary");
    }
  });

  it("maps an unknown SDK error to category=unknown", async () => {
    createMock.mockRejectedValueOnce(new Error("network blew up"));
    try {
      await anthropicProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-ant-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("sk-ant-leak-canary");
      expect((caught as Error).message).not.toContain("network blew up");
    }
  });

  it("serializes ProviderError to a bounded shape via JSON.stringify", async () => {
    createMock.mockRejectedValueOnce(new Error("boom"));
    try {
      await anthropicProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-ant-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      const serialized = JSON.stringify(caught);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual({
        name: "ProviderError",
        provider: "anthropic",
        category: "unknown",
        message: expect.any(String),
      });
      expect(serialized).not.toContain("sk-ant-leak-canary");
      expect(serialized).not.toContain("boom");
    }
  });

  it("maps a non-text content block to category=unknown", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "t", input: {} }],
    });
    try {
      await anthropicProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "sk-ant-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
    }
  });
});

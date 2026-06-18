import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("openai", async () => {
  const actual = await vi.importActual<typeof import("openai")>("openai");

  class MockAzureOpenAI {
    chat: { completions: { create: typeof createMock } };
    constructor(opts: {
      apiKey: string;
      endpoint: string;
      deployment: string;
      apiVersion: string;
    }) {
      constructorMock(opts);
      this.chat = { completions: { create: createMock } };
    }
  }

  return {
    ...actual,
    AzureOpenAI: MockAzureOpenAI,
  };
});

import { azureProvider } from "./azure";
import { ProviderError } from "./types";

const OpenAI = await import("openai");

function chatResponse(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
  };
}

const baseParams = {
  system: "sys",
  userMessage: "hi",
  apiKey: "azure-key-1234567890",
  model: "gpt-4o-mini",
  extras: {
    endpoint: "https://example.cognitiveservices.azure.com",
    apiVersion: "2025-01-01-preview",
  },
};

describe("azureProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultModel", () => {
    expect(typeof azureProvider.defaultModel).toBe("string");
    expect(azureProvider.defaultModel.length).toBeGreaterThan(0);
  });

  it("constructs the SDK client with apiKey + endpoint + deployment + apiVersion", async () => {
    createMock.mockResolvedValueOnce(chatResponse("hello"));
    await azureProvider.complete(baseParams);
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "azure-key-1234567890",
      endpoint: "https://example.cognitiveservices.azure.com",
      deployment: "gpt-4o-mini",
      apiVersion: "2025-01-01-preview",
    });
  });

  it("sends system + user messages with model = deployment name", async () => {
    createMock.mockResolvedValueOnce(chatResponse("response"));
    await azureProvider.complete({
      ...baseParams,
      system: "you are a bot",
      userMessage: "hello there",
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

  it("defaults apiVersion when extras.apiVersion is absent", async () => {
    createMock.mockResolvedValueOnce(chatResponse("response"));
    await azureProvider.complete({
      ...baseParams,
      extras: { endpoint: baseParams.extras.endpoint },
    });
    const call = constructorMock.mock.calls[0]?.[0] as { apiVersion: string };
    expect(call.apiVersion).toBe("2025-01-01-preview");
  });

  it("returns the assistant text from the first choice", async () => {
    createMock.mockResolvedValueOnce(chatResponse("the answer"));
    const result = await azureProvider.complete(baseParams);
    expect(result).toEqual({ reply: "the answer" });
  });

  it("throws invalid_key when endpoint is missing", async () => {
    try {
      await azureProvider.complete({
        ...baseParams,
        extras: { apiVersion: "2025-01-01-preview" },
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("invalid_key");
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it("throws invalid_key when model (deployment) is missing", async () => {
    try {
      await azureProvider.complete({
        ...baseParams,
        model: undefined,
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("invalid_key");
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps 401 to category=invalid_key", async () => {
    const err = new OpenAI.AuthenticationError(401, { message: "bad key" }, "Unauthorized", {});
    createMock.mockRejectedValueOnce(err);
    try {
      await azureProvider.complete({ ...baseParams, apiKey: "azure-leak-canary-9876543210" });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("invalid_key");
      expect((caught as Error).message).not.toContain("azure-leak-canary");
    }
  });

  it("maps 404 to category=invalid_key (wrong deployment/endpoint)", async () => {
    const err = new OpenAI.NotFoundError(404, { message: "not found" }, "Not Found", {});
    createMock.mockRejectedValueOnce(err);
    try {
      await azureProvider.complete(baseParams);
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("invalid_key");
    }
  });

  it("maps 429 to category=rate_limit", async () => {
    const err = new OpenAI.RateLimitError(429, { message: "slow" }, "Too Many", {});
    createMock.mockRejectedValueOnce(err);
    try {
      await azureProvider.complete(baseParams);
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("rate_limit");
    }
  });

  it("maps an unknown error to category=unknown", async () => {
    createMock.mockRejectedValueOnce(new Error("network boom"));
    try {
      await azureProvider.complete({ ...baseParams, apiKey: "azure-leak-canary-9876543210" });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("azure-leak-canary");
      expect((caught as Error).message).not.toContain("network boom");
    }
  });

  it("maps a missing message content to category=unknown", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: null, role: "assistant" } }],
    });
    try {
      await azureProvider.complete(baseParams);
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).category).toBe("unknown");
    }
  });
});

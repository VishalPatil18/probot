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

import { ollamaProvider } from "./ollama";
import { ProviderError } from "./types";

const OpenAI = await import("openai");

function chatResponse(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
  };
}

describe("ollamaProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultModel", () => {
    expect(ollamaProvider.defaultModel).toBe("llama3.2");
  });

  it("appends /v1 to the base URL and uses a placeholder key", async () => {
    createMock.mockResolvedValueOnce(chatResponse("hello"));
    await ollamaProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "",
      model: "llama3.2",
      extras: { baseUrl: "http://localhost:11434" },
    });
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "ollama",
      baseURL: "http://localhost:11434/v1",
    });
  });

  it("does not double-append /v1 when the base URL already has it", async () => {
    createMock.mockResolvedValueOnce(chatResponse("hello"));
    await ollamaProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "",
      extras: { baseUrl: "http://localhost:11434/v1/" },
    });
    expect(constructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://localhost:11434/v1" }),
    );
  });

  it("returns the assistant text from the first choice", async () => {
    createMock.mockResolvedValueOnce(chatResponse("local answer"));
    const result = await ollamaProvider.complete({
      system: "sys",
      userMessage: "hi",
      apiKey: "",
      extras: { baseUrl: "http://localhost:11434" },
    });
    expect(result).toEqual({ reply: "local answer" });
  });

  it("fails with invalid_key when no base URL is supplied", async () => {
    try {
      await ollamaProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProviderError);
      expect((caught as ProviderError).provider).toBe("ollama");
      expect((caught as ProviderError).category).toBe("invalid_key");
    }
    expect(constructorMock).not.toHaveBeenCalled();
  });

  it("maps 404 to category=invalid_key (model not pulled)", async () => {
    const err = new OpenAI.NotFoundError(
      404,
      { message: "model not found" },
      "Not Found",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await ollamaProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "",
        extras: { baseUrl: "http://localhost:11434" },
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect((caught as ProviderError).category).toBe("invalid_key");
    }
  });

  it("maps a connection failure to category=unknown", async () => {
    createMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    try {
      await ollamaProvider.complete({
        system: "sys",
        userMessage: "hi",
        apiKey: "",
        extras: { baseUrl: "http://localhost:11434" },
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect((caught as ProviderError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("ECONNREFUSED");
    }
  });
});

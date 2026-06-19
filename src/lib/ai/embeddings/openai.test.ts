import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("openai", async () => {
  const actual = await vi.importActual<typeof import("openai")>("openai");

  class MockOpenAI {
    embeddings: { create: typeof createMock };
    constructor(opts: { apiKey: string }) {
      constructorMock(opts);
      this.embeddings = { create: createMock };
    }
  }

  return {
    ...actual,
    default: MockOpenAI,
  };
});

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  openaiEmbedder,
} from "./openai";
import { EmbeddingError } from "./types";

const OpenAI = await import("openai");

function vec(seed: number, dims: number = DEFAULT_EMBEDDING_DIMENSIONS) {
  const arr = new Array<number>(dims);
  for (let i = 0; i < dims; i += 1) {
    arr[i] = (seed + i) / 10000;
  }
  return arr;
}

function embedResponse(seeds: number[]) {
  return {
    data: seeds.map((seed, index) => ({
      object: "embedding" as const,
      index,
      embedding: vec(seed),
    })),
  };
}

describe("openaiEmbedder", () => {
  beforeEach(() => {
    createMock.mockReset();
    constructorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("declares the configured model + dimensions", () => {
    expect(openaiEmbedder.name).toBe("openai");
    expect(openaiEmbedder.model).toBe(DEFAULT_EMBEDDING_MODEL);
    expect(openaiEmbedder.dimensions).toBe(DEFAULT_EMBEDDING_DIMENSIONS);
  });

  it("throws empty_input when called with no texts", async () => {
    try {
      await openaiEmbedder.embed({
        texts: [],
        apiKey: "sk-openai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("empty_input");
    }
  });

  it("constructs the SDK with the per-request apiKey", async () => {
    createMock.mockResolvedValueOnce(embedResponse([1]));
    await openaiEmbedder.embed({
      texts: ["hello"],
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
  });

  it("sends model + dimensions + input batch in expected shape", async () => {
    createMock.mockResolvedValueOnce(embedResponse([1, 2]));
    await openaiEmbedder.embed({
      texts: ["alpha", "beta"],
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(createMock).toHaveBeenCalledWith({
      model: DEFAULT_EMBEDDING_MODEL,
      dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
      input: ["alpha", "beta"],
    });
  });

  it("returns one vector per input in stable order", async () => {
    createMock.mockResolvedValueOnce(embedResponse([10, 20, 30]));
    const out = await openaiEmbedder.embed({
      texts: ["a", "b", "c"],
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual(vec(10));
    expect(out[1]).toEqual(vec(20));
    expect(out[2]).toEqual(vec(30));
  });

  it("batches inputs over 96 into multiple API calls", async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
    createMock
      .mockResolvedValueOnce(embedResponse(seeds.slice(0, 96)))
      .mockResolvedValueOnce(embedResponse(seeds.slice(96, 192)))
      .mockResolvedValueOnce(embedResponse(seeds.slice(192, 200)));
    const out = await openaiEmbedder.embed({
      texts: seeds.map((s) => `text-${s}`),
      apiKey: "sk-openai-test-XYZ-1234567890",
    });
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(out).toHaveLength(200);
    expect(out[0]).toEqual(vec(1));
    expect(out[199]).toEqual(vec(200));
  });

  it("throws dimension_mismatch when a returned vector has wrong size", async () => {
    createMock.mockResolvedValueOnce({
      data: [{ object: "embedding", index: 0, embedding: vec(1, 999) }],
    });
    try {
      await openaiEmbedder.embed({
        texts: ["x"],
        apiKey: "sk-openai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("dimension_mismatch");
    }
  });

  it("throws unknown when API returns fewer vectors than inputs", async () => {
    createMock.mockResolvedValueOnce({ data: [] });
    try {
      await openaiEmbedder.embed({
        texts: ["x"],
        apiKey: "sk-openai-test-XYZ-1234567890",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("unknown");
    }
  });

  it("maps 401 AuthenticationError to invalid_key without leaking the key", async () => {
    const err = new OpenAI.AuthenticationError(
      401,
      { message: "bad key" },
      "Unauthorized",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await openaiEmbedder.embed({
        texts: ["x"],
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("invalid_key");
      expect((caught as Error).message).not.toContain("sk-openai-leak-canary");
    }
  });

  it("maps 429 RateLimitError to rate_limit", async () => {
    const err = new OpenAI.RateLimitError(
      429,
      { message: "slow down" },
      "Too Many Requests",
      {},
    );
    createMock.mockRejectedValueOnce(err);
    try {
      await openaiEmbedder.embed({
        texts: ["x"],
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("rate_limit");
    }
  });

  it("maps an unknown SDK error to category=unknown without leaking input", async () => {
    createMock.mockRejectedValueOnce(new Error("network blew up"));
    try {
      await openaiEmbedder.embed({
        texts: ["secret payload"],
        apiKey: "sk-openai-leak-canary-9876543210",
      });
      throw new Error("expected throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(EmbeddingError);
      expect((caught as EmbeddingError).category).toBe("unknown");
      expect((caught as Error).message).not.toContain("sk-openai-leak-canary");
      expect((caught as Error).message).not.toContain("secret payload");
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    execute: executeMock,
  },
}));

import type { EmbeddingProvider } from "@/lib/ai/embeddings";
import {
  DEFAULT_SIMILARITY_FLOOR,
  DEFAULT_TOP_K,
  retrieveRelevant,
} from "./retrieve";

function makeEmbedder(
  embedImpl: (texts: string[]) => number[][],
): EmbeddingProvider {
  return {
    name: "openai",
    model: "text-embedding-3-large",
    dimensions: 1536,
    embed: vi.fn(async ({ texts }) => embedImpl(texts)),
  };
}

function row(
  contentText: string,
  similarity: number,
  sourceName = "resume.pdf",
  chunkIndex = 0,
) {
  return {
    content_text: contentText,
    source_name: sourceName,
    chunk_index: chunkIndex,
    similarity,
  };
}

describe("retrieveRelevant", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] for an empty query without calling embedder or DB", async () => {
    const embedder = makeEmbedder(() => [[1]]);
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "   ",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(out).toEqual([]);
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("embeds the (trimmed) query and queries with the bot id", async () => {
    const embedder = makeEmbedder(() => [[0.1, 0.2, 0.3]]);
    executeMock.mockResolvedValueOnce({ rows: [] });
    await retrieveRelevant({
      botId: "bot-xyz",
      query: "  what is vishal good at?  ",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(embedder.embed).toHaveBeenCalledWith({
      texts: ["what is vishal good at?"],
      apiKey: "sk-test",
    });
    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sqlArg] = executeMock.mock.calls[0] ?? [];
    const flat = JSON.stringify(sqlArg);
    expect(flat).toContain("bot-xyz");
    expect(flat).toContain("[0.1,0.2,0.3]");
  });

  it("returns rows with similarity >= floor, dropping below-floor results", async () => {
    const embedder = makeEmbedder(() => [[0.1]]);
    executeMock.mockResolvedValueOnce({
      rows: [
        row("very relevant", 0.92),
        row("borderline", 0.51),
        row("noise", 0.42),
        row("more noise", 0.1),
      ],
    });
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "test",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(out.map((c) => c.contentText)).toEqual([
      "very relevant",
      "borderline",
    ]);
    expect(out[0]?.similarity).toBe(0.92);
  });

  it("coerces string similarity values from pg numeric to number", async () => {
    const embedder = makeEmbedder(() => [[0.1]]);
    executeMock.mockResolvedValueOnce({
      rows: [
        {
          content_text: "match",
          source_name: "resume.pdf",
          chunk_index: 0,
          similarity: "0.87",
        },
      ],
    });
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "test",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.similarity).toBeCloseTo(0.87, 5);
    expect(typeof out[0]?.similarity).toBe("number");
  });

  it("returns [] when DB returns no rows (no-embeddings case)", async () => {
    const embedder = makeEmbedder(() => [[0.1]]);
    executeMock.mockResolvedValueOnce({ rows: [] });
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "test",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(out).toEqual([]);
  });

  it("returns [] when every result is below the floor", async () => {
    const embedder = makeEmbedder(() => [[0.1]]);
    executeMock.mockResolvedValueOnce({
      rows: [row("a", 0.1), row("b", 0.2)],
    });
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "test",
      apiKey: "sk-test",
      options: { embedder },
    });
    expect(out).toEqual([]);
  });

  it("honors caller-supplied topK + similarityFloor overrides", async () => {
    const embedder = makeEmbedder(() => [[0.1]]);
    executeMock.mockResolvedValueOnce({
      rows: [row("a", 0.31), row("b", 0.29)],
    });
    const out = await retrieveRelevant({
      botId: "bot-1",
      query: "test",
      apiKey: "sk-test",
      options: { embedder, topK: 10, similarityFloor: 0.3 },
    });
    expect(out.map((c) => c.contentText)).toEqual(["a"]);
    const flat = JSON.stringify(executeMock.mock.calls[0]?.[0]);
    expect(flat).toContain("10");
  });

  it("exposes sane defaults via exported constants", () => {
    expect(DEFAULT_TOP_K).toBe(5);
    expect(DEFAULT_SIMILARITY_FLOOR).toBe(0.5);
  });
});

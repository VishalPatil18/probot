import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, updateMock, updateSetMock, updateWhereMock } = vi.hoisted(
  () => ({
    selectMock: vi.fn(),
    updateMock: vi.fn(),
    updateSetMock: vi.fn<(payload: Record<string, unknown>) => unknown>(),
    updateWhereMock: vi.fn(async () => undefined),
  }),
);

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
  knowledgeBase: {
    id: "id",
    botId: "botId",
    sourceName: "sourceName",
    contentText: "contentText",
    embedding: "embedding",
  },
}));

import type { EmbeddingProvider } from "@/lib/ai/embeddings";
import { embedChunks } from "./embed-chunks";

function makeEmbedder(
  embedImpl: (texts: string[]) => number[][],
  model = "text-embedding-3-large",
): EmbeddingProvider {
  return {
    name: "openai",
    model,
    dimensions: 1536,
    embed: vi.fn(async ({ texts }) => embedImpl(texts)),
  };
}

function mockSelectReturning(rows: Array<{ id: string; contentText: string }>) {
  selectMock.mockReturnValueOnce({
    from: () => ({
      where: () => Promise.resolve(rows),
    }),
  });
}

describe("embedChunks", () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
    updateSetMock.mockReset();
    updateWhereMock.mockClear();
    updateMock.mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReturnValue({ where: updateWhereMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0/0 and skips embedder when no rows need embeddings", async () => {
    mockSelectReturning([]);
    const embedder = makeEmbedder(() => [[0.1]]);
    const result = await embedChunks({
      botId: "bot-1",
      sourceName: "resume.pdf",
      apiKey: "sk-test",
      embedder,
    });
    expect(result).toEqual({ embedded: 0, skipped: 0 });
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("embeds each row's contentText and UPDATEs with vector + model", async () => {
    mockSelectReturning([
      { id: "row-1", contentText: "alpha" },
      { id: "row-2", contentText: "beta" },
    ]);
    const embedder = makeEmbedder(
      () => [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
      "text-embedding-3-large",
    );
    const result = await embedChunks({
      botId: "bot-1",
      sourceName: "resume.pdf",
      apiKey: "sk-test",
      embedder,
    });
    expect(result).toEqual({ embedded: 2, skipped: 0 });
    expect(embedder.embed).toHaveBeenCalledWith({
      texts: ["alpha", "beta"],
      apiKey: "sk-test",
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    // Each UPDATE .set() received a vector literal + the model name
    const setCalls = updateSetMock.mock.calls;
    expect(setCalls).toHaveLength(2);
    expect(setCalls[0]?.[0]).toMatchObject({
      embeddingModel: "text-embedding-3-large",
    });
    // The first call's vector literal string contains both numbers from the
    // first vector. Drizzle wraps the sql template in an opaque object, so we
    // serialize and search.
    const firstSet = JSON.stringify(setCalls[0]?.[0]);
    expect(firstSet).toContain("0.1");
    expect(firstSet).toContain("0.2");
    const secondSet = JSON.stringify(setCalls[1]?.[0]);
    expect(secondSet).toContain("0.3");
    expect(secondSet).toContain("0.4");
  });

  it("throws when embedder returns a wrong number of vectors", async () => {
    mockSelectReturning([
      { id: "row-1", contentText: "alpha" },
      { id: "row-2", contentText: "beta" },
    ]);
    const embedder = makeEmbedder(() => [[0.1]]);
    await expect(
      embedChunks({
        botId: "bot-1",
        sourceName: "resume.pdf",
        apiKey: "sk-test",
        embedder,
      }),
    ).rejects.toThrow(/embedder returned 1 vectors for 2 chunks/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("propagates embedder errors to caller (caller decides fallback)", async () => {
    mockSelectReturning([{ id: "row-1", contentText: "alpha" }]);
    const embedder: EmbeddingProvider = {
      name: "openai",
      model: "text-embedding-3-large",
      dimensions: 1536,
      embed: vi.fn(async () => {
        throw new Error("network blew up");
      }),
    };
    await expect(
      embedChunks({
        botId: "bot-1",
        sourceName: "resume.pdf",
        apiKey: "sk-test",
        embedder,
      }),
    ).rejects.toThrow(/network blew up/);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

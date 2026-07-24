import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const extractPdfTextMock = vi.fn();
const chunkTextMock = vi.fn();
const assembleAndSaveBotContextMock = vi.fn();
const deleteSourceMock = vi.fn();
const embedChunksMock = vi.fn();
const dbCountMock = vi.fn();
const dbInsertMock = vi.fn();
const dbInsertValuesMock = vi.fn();
const dbSelectMock = vi.fn();

dbInsertMock.mockReturnValue({ values: dbInsertValuesMock });

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/ingestion/extract-pdf", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ingestion/extract-pdf")
  >("@/lib/ingestion/extract-pdf");
  return {
    ...actual,
    extractPdfText: (...args: unknown[]) => extractPdfTextMock(...args),
  };
});

vi.mock("@/lib/ingestion/chunk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ingestion/chunk")>(
    "@/lib/ingestion/chunk",
  );
  return {
    ...actual,
    chunkText: (...args: unknown[]) => chunkTextMock(...args),
  };
});

vi.mock("@/lib/ingestion/assemble", () => ({
  assembleAndSaveBotContext: (...args: unknown[]) =>
    assembleAndSaveBotContextMock(...args),
  deleteSource: (...args: unknown[]) => deleteSourceMock(...args),
}));

vi.mock("@/lib/ingestion/embed-chunks", () => ({
  embedChunks: (...args: unknown[]) => embedChunksMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $count: (...args: unknown[]) => dbCountMock(...args),
    insert: (...args: unknown[]) => dbInsertMock(...args),
    select: (...args: unknown[]) => dbSelectMock(...args),
  },
  knowledgeBase: { botId: "bot_id-col" } as Record<string, unknown>,
}));

import { IngestionError } from "@/lib/ingestion/errors";

import { POST } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };
const OWNER_BOT = {
  id: BOT_ID,
  userId: "user-1",
  contextText: "",
  contextTokenCap: 12_000,
};

function multipart(parts: {
  text?: string;
  files?: File[];
  embeddingKey?: string;
}): Request {
  const form = new FormData();
  if (parts.text !== undefined) form.set("text", parts.text);
  if (parts.files) {
    for (const f of parts.files) form.append("files", f, f.name);
  }
  const headers: Record<string, string> = {};
  if (parts.embeddingKey !== undefined) {
    headers["x-embedding-api-key"] = parts.embeddingKey;
  }
  return new Request(`http://localhost/api/bots/${BOT_ID}/knowledge`, {
    method: "POST",
    body: form,
    headers,
  });
}

function pdfFile(name: string, body = "%PDF-1.4 test"): File {
  return new File([body], name, { type: "application/pdf" });
}

describe("POST /api/bots/[botId]/knowledge", () => {
  beforeEach(() => {
    requireBotOwnerMock
      .mockReset()
      .mockResolvedValue({ ok: true, bot: OWNER_BOT, userId: "user-1" });
    extractPdfTextMock.mockReset().mockResolvedValue("extracted text");
    chunkTextMock
      .mockReset()
      .mockReturnValue([
        { contentText: "chunk-0", chunkIndex: 0, tokenCount: 10 },
      ]);
    assembleAndSaveBotContextMock
      .mockReset()
      .mockResolvedValue({ text: "ok", totalTokens: 10, truncated: false });
    deleteSourceMock.mockReset().mockResolvedValue(0);
    embedChunksMock.mockReset().mockResolvedValue({ embedded: 1, skipped: 0 });
    dbCountMock.mockReset().mockResolvedValue(0);
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockReset().mockResolvedValue(undefined);
    dbSelectMock.mockReset().mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
    });
  });

  it("returns 401 when requireBotOwner denies", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });
    const res = await POST(multipart({ text: "hi" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("rejects non-multipart Content-Type with 415", async () => {
    const req = new Request(`http://localhost/api/bots/${BOT_ID}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(415);
  });

  it("rejects empty payload (no text, no files) with 400", async () => {
    const res = await POST(multipart({}), PARAMS);
    expect(res.status).toBe(400);
  });

  it("rejects more than MAX_PDF_FILES (5) with 400", async () => {
    const files = Array.from({ length: 6 }, (_, i) => pdfFile(`f${i}.pdf`));
    const res = await POST(multipart({ files }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("processes a single text-only submission and returns 200", async () => {
    const res = await POST(multipart({ text: "my bio" }), PARAMS);
    expect(res.status).toBe(200);
    expect(deleteSourceMock).toHaveBeenCalledWith(BOT_ID, "manual_text");
    expect(chunkTextMock).toHaveBeenCalledWith("my bio");
    expect(dbInsertValuesMock).toHaveBeenCalledOnce();
    expect(assembleAndSaveBotContextMock).toHaveBeenCalledWith(BOT_ID);
  });

  it("processes a PDF: extract → delete-source → insert chunks", async () => {
    extractPdfTextMock.mockResolvedValueOnce("pdf content here");
    const res = await POST(
      multipart({ files: [pdfFile("resume.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    expect(extractPdfTextMock).toHaveBeenCalledOnce();
    expect(deleteSourceMock).toHaveBeenCalledWith(BOT_ID, "resume.pdf");
    expect(chunkTextMock).toHaveBeenCalledWith("pdf content here");
    expect(assembleAndSaveBotContextMock).toHaveBeenCalledWith(BOT_ID);
  });

  it("processes PDF + text together", async () => {
    extractPdfTextMock.mockResolvedValueOnce("pdf body");
    const res = await POST(
      multipart({ text: "manual bio", files: [pdfFile("cv.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    expect(deleteSourceMock).toHaveBeenCalledWith(BOT_ID, "cv.pdf");
    expect(deleteSourceMock).toHaveBeenCalledWith(BOT_ID, "manual_text");
    expect(chunkTextMock).toHaveBeenCalledTimes(2);
  });

  it("seeds manual_text from existing contextText when knowledge_base is empty", async () => {
    requireBotOwnerMock.mockReset().mockResolvedValue({
      ok: true,
      bot: { ...OWNER_BOT, contextText: "legacy stage 1 text" },
      userId: "user-1",
    });
    dbCountMock.mockResolvedValueOnce(0);
    extractPdfTextMock.mockResolvedValueOnce("pdf body");

    const res = await POST(
      multipart({ files: [pdfFile("resume.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    expect(chunkTextMock).toHaveBeenCalledWith("legacy stage 1 text");
  });

  it("does not seed when knowledge_base already has rows", async () => {
    requireBotOwnerMock.mockReset().mockResolvedValue({
      ok: true,
      bot: { ...OWNER_BOT, contextText: "legacy text" },
      userId: "user-1",
    });
    dbCountMock.mockResolvedValueOnce(3);
    extractPdfTextMock.mockResolvedValueOnce("pdf body");

    const res = await POST(
      multipart({ files: [pdfFile("resume.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    expect(chunkTextMock).toHaveBeenCalledTimes(1);
    expect(chunkTextMock).toHaveBeenCalledWith("pdf body");
  });

  it("records a per-file error for IngestionError('file_too_large') without 4xx-ing the batch", async () => {
    extractPdfTextMock.mockRejectedValueOnce(
      new IngestionError("file_too_large", "too big"),
    );
    const res = await POST(multipart({ files: [pdfFile("big.pdf")] }), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      files: Array<{ name: string; ok: boolean; category?: string }>;
    };
    expect(body.files[0]).toMatchObject({
      name: "big.pdf",
      ok: false,
      category: "file_too_large",
    });
  });

  it("records a per-file error for IngestionError('pdf_unreadable')", async () => {
    extractPdfTextMock.mockRejectedValueOnce(
      new IngestionError("pdf_unreadable", "corrupt"),
    );
    const res = await POST(multipart({ files: [pdfFile("bad.pdf")] }), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      files: Array<{ ok: boolean; category?: string }>;
    };
    expect(body.files[0]).toMatchObject({ ok: false, category: "pdf_unreadable" });
  });

  it("records a per-file error for a non-pdf mime type", async () => {
    const txtFile = new File(["hi"], "notes.txt", { type: "text/plain" });
    const res = await POST(multipart({ files: [txtFile] }), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      files: Array<{ ok: boolean; category?: string }>;
    };
    expect(body.files[0]).toMatchObject({
      ok: false,
      category: "invalid_file_type",
    });
  });

  it("processes good files and records failures independently (partial success)", async () => {
    extractPdfTextMock
      .mockResolvedValueOnce("good content")
      .mockRejectedValueOnce(new IngestionError("pdf_unreadable", "corrupt"));
    const res = await POST(
      multipart({ files: [pdfFile("good.pdf"), pdfFile("bad.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      files: Array<{ name: string; ok: boolean }>;
    };
    expect(body.files).toHaveLength(2);
    expect(body.files.find((f) => f.name === "good.pdf")?.ok).toBe(true);
    expect(body.files.find((f) => f.name === "bad.pdf")?.ok).toBe(false);
  });

  describe("Stage 3 RAG (embedding key)", () => {
    const EMBEDDING_KEY = "sk-openai-emb-XYZ-1234567890";

    it("skips embedChunks entirely when no x-embedding-api-key header is sent", async () => {
      const res = await POST(multipart({ text: "my bio" }), PARAMS);
      expect(res.status).toBe(200);
      expect(embedChunksMock).not.toHaveBeenCalled();
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.embedded).toBe(false);
    });

    it("calls embedChunks per processed source when key is provided", async () => {
      extractPdfTextMock.mockResolvedValueOnce("pdf content");
      const res = await POST(
        multipart({
          text: "manual bio",
          files: [pdfFile("resume.pdf")],
          embeddingKey: EMBEDDING_KEY,
        }),
        PARAMS,
      );
      expect(res.status).toBe(200);
      expect(embedChunksMock).toHaveBeenCalledTimes(2);
      expect(embedChunksMock).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: BOT_ID,
          sourceName: "resume.pdf",
          apiKey: EMBEDDING_KEY,
        }),
      );
      expect(embedChunksMock).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: BOT_ID,
          sourceName: "manual_text",
          apiKey: EMBEDDING_KEY,
        }),
      );
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.embedded).toBe(true);
    });

    it("does NOT fail the request when embedChunks throws - returns 200 with bounded embeddingError category", async () => {
      embedChunksMock.mockRejectedValueOnce(
        new Error("OpenAI rejected key sk-openai-leak-canary-9999"),
      );
      const res = await POST(
        multipart({ text: "my bio", embeddingKey: EMBEDDING_KEY }),
        PARAMS,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.embedded).toBe(false);
      expect(body.embeddingError).toBe("embedding_failed");
      const raw = JSON.stringify(body);
      expect(raw).not.toContain("sk-openai-leak-canary");
      expect(assembleAndSaveBotContextMock).toHaveBeenCalledWith(BOT_ID);
    });

    it("maps EmbeddingError categories into embeddingError without leaking message", async () => {
      const { EmbeddingError } = await import("@/lib/ai/embeddings");
      embedChunksMock.mockRejectedValueOnce(
        new EmbeddingError(
          "openai",
          "invalid_key",
          "key sk-openai-leak-XXX bad",
        ),
      );
      const res = await POST(
        multipart({ text: "my bio", embeddingKey: EMBEDDING_KEY }),
        PARAMS,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.embeddingError).toBe("invalid_key");
      const raw = JSON.stringify(body);
      expect(raw).not.toContain("sk-openai-leak");
    });

    it("rejects a malformed (too-short) embedding key with 400", async () => {
      const res = await POST(
        multipart({ text: "my bio", embeddingKey: "abc" }),
        PARAMS,
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toBe("invalid_embedding_key");
    });
  });
});

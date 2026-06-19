import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const extractPdfTextMock = vi.fn();
const chunkTextMock = vi.fn();
const assembleAndSaveBotContextMock = vi.fn();
const deleteSourceMock = vi.fn();
const dbCountMock = vi.fn();
const dbInsertMock = vi.fn();
const dbInsertValuesMock = vi.fn();
const dbSelectMock = vi.fn();

dbInsertMock.mockReturnValue({ values: dbInsertValuesMock });

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/ingestion/extract-pdf", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ingestion/extract-pdf")>(
      "@/lib/ingestion/extract-pdf",
    );
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

function multipart(parts: { text?: string; files?: File[] }): Request {
  const form = new FormData();
  if (parts.text !== undefined) form.set("text", parts.text);
  if (parts.files) {
    for (const f of parts.files) form.append("files", f, f.name);
  }
  return new Request(`http://localhost/api/bots/${BOT_ID}/knowledge`, {
    method: "POST",
    body: form,
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
    dbCountMock.mockReset().mockResolvedValue(0);
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockReset().mockResolvedValue(undefined);
    // GET-style select used by summarizeSources
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
    // both sources got their delete-then-insert
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
    // seed: chunkText called for "legacy stage 1 text" before processing the PDF
    expect(chunkTextMock).toHaveBeenCalledWith("legacy stage 1 text");
  });

  it("does not seed when knowledge_base already has rows", async () => {
    requireBotOwnerMock.mockReset().mockResolvedValue({
      ok: true,
      bot: { ...OWNER_BOT, contextText: "legacy text" },
      userId: "user-1",
    });
    dbCountMock.mockResolvedValueOnce(3); // already has chunks
    extractPdfTextMock.mockResolvedValueOnce("pdf body");

    const res = await POST(
      multipart({ files: [pdfFile("resume.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    // chunkText only called for the pdf body, never for the legacy text
    expect(chunkTextMock).toHaveBeenCalledTimes(1);
    expect(chunkTextMock).toHaveBeenCalledWith("pdf body");
  });

  it("maps IngestionError('file_too_large') to 413", async () => {
    extractPdfTextMock.mockRejectedValueOnce(
      new IngestionError("file_too_large", "too big"),
    );
    const res = await POST(
      multipart({ files: [pdfFile("big.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(413);
  });

  it("maps IngestionError('pdf_unreadable') to 422", async () => {
    extractPdfTextMock.mockRejectedValueOnce(
      new IngestionError("pdf_unreadable", "corrupt"),
    );
    const res = await POST(
      multipart({ files: [pdfFile("bad.pdf")] }),
      PARAMS,
    );
    expect(res.status).toBe(422);
  });

  it("rejects non-pdf mime type with 415", async () => {
    const txtFile = new File(["hi"], "notes.txt", { type: "text/plain" });
    const res = await POST(multipart({ files: [txtFile] }), PARAMS);
    expect(res.status).toBe(415);
  });
});

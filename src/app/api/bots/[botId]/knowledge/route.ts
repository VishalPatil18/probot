import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { EmbeddingError } from "@/lib/ai/embeddings";
import { KeyTransportError, readEmbeddingApiKey } from "@/lib/ai/key-transport";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { db, knowledgeBase } from "@/lib/db";
import {
  assembleAndSaveBotContext,
  deleteSource,
} from "@/lib/ingestion/assemble";
import { chunkText } from "@/lib/ingestion/chunk";
import { embedChunks } from "@/lib/ingestion/embed-chunks";
import { IngestionError } from "@/lib/ingestion/errors";
import {
  MAX_PDF_BYTES,
  MAX_PDF_FILES,
  PDF_MIME_TYPE,
  extractPdfText,
} from "@/lib/ingestion/extract-pdf";

const MANUAL_TEXT_SOURCE = "manual_text";

// Maps IngestionError categories to HTTP status codes.
function statusForCategory(category: IngestionError["category"]): number {
  switch (category) {
    case "file_too_large":
      return 413;
    case "invalid_file_type":
      return 415;
    case "too_many_files":
      return 400;
    case "pdf_unreadable":
    case "empty_extract":
    case "empty_input":
      return 422;
  }
}

interface SourceSummary {
  name: string;
  sourceType: "pdf" | "text";
  chunkCount: number;
  tokenCount: number;
}

// POST /api/bots/[botId]/knowledge
// Accepts multipart/form-data:
//   text (optional string) - manual text; stored as `manual_text` source
//   files[] (optional PDFs) - up to MAX_PDF_FILES, each ≤ MAX_PDF_BYTES
// At least one of {text, files[]} must be provided.
// Per-source replace: existing rows with the same source_name are deleted.
// After insert, reassembles `bots.context_text` from all chunks.
export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 415 },
    );
  }

  // Stage 3 RAG: optional OpenAI key for embedding generation. Absent header
  // means "skip embeddings" - the bot falls back to full-context at chat
  // time. Malformed header (wrong length) is rejected early.
  let embeddingApiKey: string | null;
  try {
    embeddingApiKey = readEmbeddingApiKey(request.headers);
  } catch (err) {
    if (err instanceof KeyTransportError) {
      return NextResponse.json(
        { error: "invalid_embedding_key" },
        { status: 400 },
      );
    }
    throw err;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse multipart body" },
      { status: 400 },
    );
  }

  const textField = formData.get("text");
  const manualText = typeof textField === "string" ? textField.trim() : "";

  const fileEntries = formData
    .getAll("files")
    .filter(
      (v): v is File => typeof v === "object" && v !== null && "name" in v,
    );

  if (fileEntries.length === 0 && manualText.length === 0) {
    return NextResponse.json(
      { error: "Provide `text`, one or more `files`, or both" },
      { status: 400 },
    );
  }
  if (fileEntries.length > MAX_PDF_FILES) {
    return NextResponse.json(
      { error: `At most ${MAX_PDF_FILES} files per upload` },
      { status: 400 },
    );
  }

  // One-time migration: if a Stage 1 bot has prose in `context_text` but no
  // knowledge_base rows yet, seed a `manual_text` source from the existing
  // text so re-assembly preserves it. This runs before per-source replace so
  // the seed sticks when the request itself provides no text.
  const existingRowCount = await db.$count(
    knowledgeBase,
    eq(knowledgeBase.botId, bot.id),
  );
  if (existingRowCount === 0 && bot.contextText.trim().length > 0) {
    await persistChunks(
      bot.id,
      MANUAL_TEXT_SOURCE,
      "text",
      bot.contextText.trim(),
    );
  }

  // Track sources we touched in this request so we only re-embed those (not
  // the whole bot every upload).
  const processedSources: string[] = [];

  try {
    // Process PDFs first so per-source replace by filename is deterministic.
    for (const file of fileEntries) {
      if (!file.name) {
        throw new IngestionError(
          "invalid_file_type",
          "File entry missing filename",
        );
      }
      if (file.size > MAX_PDF_BYTES) {
        throw new IngestionError(
          "file_too_large",
          `${file.name} exceeds ${MAX_PDF_BYTES} bytes`,
        );
      }
      if (file.type && file.type !== PDF_MIME_TYPE) {
        throw new IngestionError(
          "invalid_file_type",
          `${file.name} is not application/pdf`,
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractPdfText(buffer);
      await deleteSource(bot.id, file.name);
      await persistChunks(bot.id, file.name, "pdf", text);
      processedSources.push(file.name);
    }

    if (manualText.length > 0) {
      await deleteSource(bot.id, MANUAL_TEXT_SOURCE);
      await persistChunks(bot.id, MANUAL_TEXT_SOURCE, "text", manualText);
      processedSources.push(MANUAL_TEXT_SOURCE);
    }
  } catch (e: unknown) {
    if (e instanceof IngestionError) {
      return NextResponse.json(
        { error: e.message, category: e.category },
        { status: statusForCategory(e.category) },
      );
    }
    throw e;
  }

  // Stage 3 RAG: embed each newly persisted source. Embedding failures are
  // logged but do NOT fail the request - the chunks remain queryable via the
  // legacy full-context path (assembled below). The user gets a degraded but
  // working bot rather than a 5xx on an OpenAI hiccup.
  let embeddingError: string | null = null;
  if (embeddingApiKey && processedSources.length > 0) {
    try {
      for (const sourceName of processedSources) {
        await embedChunks({
          botId: bot.id,
          sourceName,
          apiKey: embeddingApiKey,
        });
      }
    } catch (err) {
      // Bound the error surface to a category - never serialize raw `err.message`
      // because a network-layer error could carry the BYO key in headers or
      // URL parts. `EmbeddingError.category` is a small string union; all
      // other errors collapse to a generic label.
      embeddingError =
        err instanceof EmbeddingError ? err.category : "embedding_failed";
    }
  }

  const result = await assembleAndSaveBotContext(bot.id);
  const sources = await summarizeSources(bot.id);

  return NextResponse.json({
    sources,
    totalTokens: result.totalTokens,
    truncated: result.truncated,
    embedded: embeddingApiKey !== null && embeddingError === null,
    ...(embeddingError ? { embeddingError } : {}),
  });
}

// GET /api/bots/[botId]/knowledge - returns sources grouped by name.
export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const sources = await summarizeSources(owner.bot.id);
  return NextResponse.json({
    sources,
    contextTokenCap: owner.bot.contextTokenCap,
  });
}

async function persistChunks(
  botId: string,
  sourceName: string,
  sourceType: "pdf" | "text",
  rawText: string,
): Promise<void> {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) return;
  await db.insert(knowledgeBase).values(
    chunks.map((c) => ({
      botId,
      sourceType,
      sourceName,
      contentText: c.contentText,
      chunkIndex: c.chunkIndex,
      tokenCount: c.tokenCount,
    })),
  );
}

async function summarizeSources(botId: string): Promise<SourceSummary[]> {
  const rows = await db
    .select({
      sourceName: knowledgeBase.sourceName,
      sourceType: knowledgeBase.sourceType,
      tokenCount: knowledgeBase.tokenCount,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.botId, botId))
    .orderBy(asc(knowledgeBase.sourceName), asc(knowledgeBase.chunkIndex));

  const grouped = new Map<string, SourceSummary>();
  for (const row of rows) {
    const existing = grouped.get(row.sourceName);
    if (existing) {
      grouped.set(row.sourceName, {
        ...existing,
        chunkCount: existing.chunkCount + 1,
        tokenCount: existing.tokenCount + row.tokenCount,
      });
    } else {
      grouped.set(row.sourceName, {
        name: row.sourceName,
        sourceType: row.sourceType as "pdf" | "text",
        chunkCount: 1,
        tokenCount: row.tokenCount,
      });
    }
  }
  return Array.from(grouped.values());
}

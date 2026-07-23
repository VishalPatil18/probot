import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { EmbeddingError } from "@/lib/ai/embeddings";
import { KeyTransportError, readEmbeddingApiKey } from "@/lib/ai/key-transport";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { db, knowledgeBase } from "@/lib/db";
import { emitNotification } from "@/lib/notifications/emit";
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
import { assertSafeBuffer } from "@/lib/uploads/malware-scan";

const MANUAL_TEXT_SOURCE = "manual_text";

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

  const processedSources: string[] = [];
  const fileResults: Array<{
    name: string;
    ok: boolean;
    error?: string;
    category?: IngestionError["category"];
  }> = [];

  for (const file of fileEntries) {
    const name = file.name || "file";
    try {
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
      assertSafeBuffer(buffer, file.name, file.type || PDF_MIME_TYPE);
      const text = await extractPdfText(buffer);
      await deleteSource(bot.id, file.name);
      await persistChunks(bot.id, file.name, "pdf", text);
      processedSources.push(file.name);
      fileResults.push({ name, ok: true });
    } catch (e: unknown) {
      if (e instanceof IngestionError) {
        fileResults.push({
          name,
          ok: false,
          error: e.message,
          category: e.category,
        });
      } else {
        fileResults.push({
          name,
          ok: false,
          error: "ingestion_failed",
          category: "pdf_unreadable",
        });
      }
    }
  }

  try {
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
      embeddingError =
        err instanceof EmbeddingError ? err.category : "embedding_failed";
    }
  }

  const result = await assembleAndSaveBotContext(bot.id);
  const sources = await summarizeSources(bot.id);

  const successfulFiles = fileResults.filter((f) => f.ok).length;
  if (processedSources.length > 0) {
    void emitNotification({
      userId: bot.userId,
      botId: bot.id,
      kind: "knowledge_updated",
      payload: {
        botId: bot.id,
        botName: bot.name,
        sourcesTouched: processedSources.length,
        filesAdded: successfulFiles,
        includesManualText: processedSources.includes(MANUAL_TEXT_SOURCE),
        totalTokens: result.totalTokens,
        truncated: result.truncated,
      },
    });
  }

  return NextResponse.json({
    sources,
    files: fileResults,
    totalTokens: result.totalTokens,
    truncated: result.truncated,
    embedded: embeddingApiKey !== null && embeddingError === null,
    ...(embeddingError ? { embeddingError } : {}),
  });
}

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

import { and, asc, eq } from "drizzle-orm";

import { bots, db, knowledgeBase } from "@/lib/db";

export interface AssembledChunk {
  sourceName: string;
  chunkIndex: number;
  contentText: string;
  tokenCount: number;
}

export interface AssembleResult {
  text: string;
  totalTokens: number;
  truncated: boolean;
}

// Concatenates chunks into a single `context_text` payload, capped at
// `tokenCap` tokens. Chunks are ordered deterministically by
// (sourceName, chunkIndex). Each chunk is separated by a blank line so the
// LLM sees prose-block boundaries.
//
// Note (tradeoff): chunkText produces overlapping chunks (default 100
// tokens of overlap) so the same content appears in adjacent chunks. The
// assembler does NOT dedupe - the RAG retrieval path replaces this assembly path
// entirely, so adding dedupe logic here would be code that gets deleted.
// The 100-token overlap is ~13% redundancy at the default 750-token target;
// the per-bot `contextTokenCap` absorbs it.
export function assembleFromChunks(
  chunks: readonly AssembledChunk[],
  tokenCap: number,
): AssembleResult {
  if (tokenCap <= 0) {
    return { text: "", totalTokens: 0, truncated: chunks.length > 0 };
  }

  const sorted = [...chunks].sort((a, b) => {
    if (a.sourceName !== b.sourceName) {
      return a.sourceName.localeCompare(b.sourceName);
    }
    return a.chunkIndex - b.chunkIndex;
  });

  const parts: string[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const chunk of sorted) {
    if (totalTokens + chunk.tokenCount > tokenCap) {
      truncated = true;
      break;
    }
    parts.push(chunk.contentText);
    totalTokens += chunk.tokenCount;
  }

  return {
    text: parts.join("\n\n"),
    totalTokens,
    truncated,
  };
}

// Reads all knowledge_base rows for a bot, assembles them under the bot's
// per-bot `contextTokenCap`, and writes the result back to `bots.context_text`
// so the chat route can keep reading the same column unchanged.
export async function assembleAndSaveBotContext(
  botId: string,
): Promise<AssembleResult> {
  const bot = await db.query.bots.findFirst({
    where: eq(bots.id, botId),
    columns: { id: true, contextTokenCap: true },
  });
  if (!bot) {
    throw new Error(`Bot not found: ${botId}`);
  }

  const rows = await db
    .select({
      sourceName: knowledgeBase.sourceName,
      chunkIndex: knowledgeBase.chunkIndex,
      contentText: knowledgeBase.contentText,
      tokenCount: knowledgeBase.tokenCount,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.botId, botId))
    .orderBy(asc(knowledgeBase.sourceName), asc(knowledgeBase.chunkIndex));

  const result = assembleFromChunks(rows, bot.contextTokenCap);

  await db
    .update(bots)
    .set({ contextText: result.text })
    .where(eq(bots.id, botId));

  return result;
}

// Deletes all chunks for one source on a bot. Used by per-source replace
// before inserting fresh chunks (Q5=b semantic).
export async function deleteSource(
  botId: string,
  sourceName: string,
): Promise<number> {
  const deleted = await db
    .delete(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.botId, botId),
        eq(knowledgeBase.sourceName, sourceName),
      ),
    )
    .returning({ id: knowledgeBase.id });
  return deleted.length;
}

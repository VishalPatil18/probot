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

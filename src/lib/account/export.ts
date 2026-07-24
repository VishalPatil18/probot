import { eq, inArray } from "drizzle-orm";

import {
  bots,
  conversations,
  db,
  knowledgeBase,
  leads,
  messages,
  users,
} from "@/lib/db";

export interface ExportBundle {
  exportedAt: string;
  user: Record<string, unknown>;
  bots: Array<{
    bot: Record<string, unknown>;
    knowledge: Array<Record<string, unknown>>;
    conversations: Array<Record<string, unknown>>;
    messages: Array<Record<string, unknown>>;
    leads: Array<Record<string, unknown>>;
  }>;
}

export async function buildExportBundle(userId: string): Promise<ExportBundle> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      name: true,
      image: true,
      llmProvider: true,
      llmModel: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    throw new Error("export_user_not_found");
  }

  const userBots = await db.query.bots.findMany({
    where: eq(bots.userId, userId),
  });

  const botIds = userBots.map((b) => b.id);

  const [allKnowledge, allConversations, allLeads] = await Promise.all([
    botIds.length > 0
      ? db.query.knowledgeBase.findMany({
          where: inArray(knowledgeBase.botId, botIds),
        })
      : Promise.resolve([]),
    botIds.length > 0
      ? db.query.conversations.findMany({
          where: inArray(conversations.botId, botIds),
        })
      : Promise.resolve([]),
    botIds.length > 0
      ? db.query.leads.findMany({
          where: inArray(leads.botId, botIds),
        })
      : Promise.resolve([]),
  ]);

  const conversationIds = allConversations.map((c) => c.id);
  const allMessages =
    conversationIds.length > 0
      ? await db.query.messages.findMany({
          where: inArray(messages.conversationId, conversationIds),
        })
      : [];

  const conversationToBot = new Map(
    allConversations.map((c) => [c.id, c.botId]),
  );
  const knowledgeByBot = groupBy(allKnowledge, (k) => k.botId);
  const conversationsByBot = groupBy(allConversations, (c) => c.botId);
  const leadsByBot = groupBy(allLeads, (l) => l.botId);
  const messagesByBot = groupBy(allMessages, (m) =>
    conversationToBot.get(m.conversationId),
  );

  return {
    exportedAt: new Date().toISOString(),
    user,
    bots: userBots.map((bot) => ({
      bot: stripBotForExport(bot),
      knowledge: (knowledgeByBot.get(bot.id) ?? []).map(stripKnowledgeForExport),
      conversations: conversationsByBot.get(bot.id) ?? [],
      messages: messagesByBot.get(bot.id) ?? [],
      leads: leadsByBot.get(bot.id) ?? [],
    })),
  };
}

export function groupBy<T>(
  rows: readonly T[],
  keyOf: (row: T) => string | undefined,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === undefined) continue;
    const bucket = out.get(key);
    if (bucket) bucket.push(row);
    else out.set(key, [row]);
  }
  return out;
}

function stripBotForExport(
  bot: Record<string, unknown>,
): Record<string, unknown> {
  const { previewToken: _previewToken, ...safe } = bot as {
    previewToken?: unknown;
    [key: string]: unknown;
  };
  return safe;
}

function stripKnowledgeForExport(
  chunk: Record<string, unknown>,
): Record<string, unknown> {
  const { embedding: _embedding, ...safe } = chunk as {
    embedding?: unknown;
    [key: string]: unknown;
  };
  return safe;
}

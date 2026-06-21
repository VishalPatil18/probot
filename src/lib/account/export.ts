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

// GDPR §NFR-C04: portable JSON dump of every row the system holds about
// one user. Includes nested bot data (knowledge chunks, conversations,
// messages, leads). Deliberately excludes:
//   - `hashedPassword` (a hash isn't useful to export, and shipping it
//     even hashed feels like inviting offline cracking)
//   - `encrypted_llm_keys` (per-bot envelope payload; meaningful only to
//     the operator's KEK, useless to a user export)
//   - NextAuth session/account rows beyond a redacted shape (OAuth tokens
//     are tied to provider-side state and can be reissued)
//
// Shape is intentionally JSON (not zip / not CSV) for two reasons: it's
// trivially diff-able by users and tools; and there's no archive format
// that doesn't pull in a dep we don't want.

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

  return {
    exportedAt: new Date().toISOString(),
    user,
    bots: userBots.map((bot) => ({
      bot: stripBotForExport(bot),
      knowledge: allKnowledge
        .filter((k) => k.botId === bot.id)
        .map(stripKnowledgeForExport),
      conversations: allConversations
        .filter((c) => c.botId === bot.id)
        .map((c) => c),
      messages: allMessages.filter((m) =>
        allConversations.some(
          (c) => c.botId === bot.id && c.id === m.conversationId,
        ),
      ),
      leads: allLeads.filter((l) => l.botId === bot.id),
    })),
  };
}

// `bots` rows hold `preview_token` which is a server-controlled credential
// (a leaked export shouldn't grant access to anyone else). Strip it.
function stripBotForExport(
  bot: Record<string, unknown>,
): Record<string, unknown> {
  const { previewToken: _previewToken, ...safe } = bot as {
    previewToken?: unknown;
    [key: string]: unknown;
  };
  return safe;
}

// `knowledge_base` rows include the raw `embedding` vector (1536 floats).
// Including it would bloat the export by ~6KB per chunk for no user value
// (vectors are model-specific and can't be replayed against other models).
// Keep the text + metadata; drop the vector.
function stripKnowledgeForExport(
  chunk: Record<string, unknown>,
): Record<string, unknown> {
  const { embedding: _embedding, ...safe } = chunk as {
    embedding?: unknown;
    [key: string]: unknown;
  };
  return safe;
}

import { and, eq, inArray } from "drizzle-orm";

import {
  bots,
  conversations,
  db,
  knowledgeBase,
  leads,
  messages,
  notifications,
} from "@/lib/db";

// Hard-wipes every piece of user-generated data (bots + everything that
// cascades off them, plus notifications) while keeping the user's account
// row intact. Distinct from account deletion which schedules a full purge
// including the `users` row after a 7-day grace window.
//
// Order of operations:
//   1. Count child rows first, so the API response can report what was
//      removed - Postgres CASCADE otherwise leaves no trace we can surface.
//   2. `DELETE FROM notifications WHERE user_id = ?` - includes both
//      bot-scoped and bot-independent notifications.
//   3. `DELETE FROM bots WHERE user_id = ?` - cascades kill
//      knowledge_base, conversations, messages, leads, bot_tokens,
//      encrypted_llm_keys, and bot_avatars for those bots.
//
// Wrapped in a transaction so a mid-flight failure leaves nothing
// half-deleted; the count queries run inside so a concurrent write
// between count-and-delete can't skew the returned totals.

export interface PurgeSummary {
  bots: number;
  knowledge: number;
  conversations: number;
  messages: number;
  leads: number;
  notifications: number;
}

export async function purgeUserData(userId: string): Promise<PurgeSummary> {
  return db.transaction(async (tx) => {
    const userBots = await tx.query.bots.findMany({
      where: eq(bots.userId, userId),
      columns: { id: true },
    });
    const botIds = userBots.map((b) => b.id);

    let knowledgeCount = 0;
    let conversationsCount = 0;
    let messagesCount = 0;
    let leadsCount = 0;

    if (botIds.length > 0) {
      const [k, c, l] = await Promise.all([
        tx.query.knowledgeBase.findMany({
          where: inArray(knowledgeBase.botId, botIds),
          columns: { id: true },
        }),
        tx.query.conversations.findMany({
          where: inArray(conversations.botId, botIds),
          columns: { id: true },
        }),
        tx.query.leads.findMany({
          where: inArray(leads.botId, botIds),
          columns: { id: true },
        }),
      ]);
      knowledgeCount = k.length;
      conversationsCount = c.length;
      leadsCount = l.length;

      const conversationIds = c.map((row) => row.id);
      if (conversationIds.length > 0) {
        const m = await tx.query.messages.findMany({
          where: inArray(messages.conversationId, conversationIds),
          columns: { id: true },
        });
        messagesCount = m.length;
      }
    }

    const notif = await tx
      .delete(notifications)
      .where(eq(notifications.userId, userId))
      .returning({ id: notifications.id });

    // Cascading FKs (`ON DELETE CASCADE`) take care of every child of
    // `bots` in one Postgres statement.
    const deletedBots = await tx
      .delete(bots)
      .where(eq(bots.userId, userId))
      .returning({ id: bots.id });

    return {
      bots: deletedBots.length,
      knowledge: knowledgeCount,
      conversations: conversationsCount,
      messages: messagesCount,
      leads: leadsCount,
      notifications: notif.length,
    };
  });
}

// Purge scoped to a single bot for the same owner. Kept alongside the
// full-purge so both flows share the same "count first, then delete"
// safety pattern. Not currently wired to a UI; exported for future use
// and to document the intended shape.
export async function purgeBotData(
  userId: string,
  botId: string,
): Promise<PurgeSummary | null> {
  return db.transaction(async (tx) => {
    const bot = await tx.query.bots.findFirst({
      where: and(eq(bots.id, botId), eq(bots.userId, userId)),
      columns: { id: true },
    });
    if (!bot) return null;

    const [k, c, l] = await Promise.all([
      tx.query.knowledgeBase.findMany({
        where: eq(knowledgeBase.botId, bot.id),
        columns: { id: true },
      }),
      tx.query.conversations.findMany({
        where: eq(conversations.botId, bot.id),
        columns: { id: true },
      }),
      tx.query.leads.findMany({
        where: eq(leads.botId, bot.id),
        columns: { id: true },
      }),
    ]);
    const conversationIds = c.map((row) => row.id);
    const m =
      conversationIds.length > 0
        ? await tx.query.messages.findMany({
            where: inArray(messages.conversationId, conversationIds),
            columns: { id: true },
          })
        : [];

    const deletedBots = await tx
      .delete(bots)
      .where(eq(bots.id, bot.id))
      .returning({ id: bots.id });

    return {
      bots: deletedBots.length,
      knowledge: k.length,
      conversations: c.length,
      messages: m.length,
      leads: l.length,
      notifications: 0,
    };
  });
}

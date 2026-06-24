import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { bots, conversations, db, messages } from "@/lib/db";

// Shared conversation queries. Called by both the API
// routes and the slice-6.3 RSC dashboard pages.
//
// **Caller contract - tenancy is the caller's responsibility.** These
// functions take a `botId` and trust the caller has already verified the
// session user owns it. `getConversationWithMessages` also filters by
// `bot_id` to prevent cross-bot ID forgery; `listConversations` filters
// by `bot_id` alone.

const FIRST_USER_MESSAGE_CHAR_LIMIT = 200;

// LATERAL subquery: for each conversation row, fetch the first user-role
// message truncated to 200 chars. Covered by the slice-6.1 composite
// index `messages_conv_created_idx` so the subquery is a sub-ms
// index scan per outer row.
const FIRST_USER_MESSAGE_SQL = sql<string | null>`(
  SELECT LEFT(${messages.content}, ${FIRST_USER_MESSAGE_CHAR_LIMIT})
  FROM ${messages}
  WHERE ${messages.conversationId} = ${conversations.id}
    AND ${messages.role} = 'user'
  ORDER BY ${messages.createdAt}
  LIMIT 1
)`;

export type ConversationListItem = {
  id: string;
  sessionId: string;
  recruiterEmail: string | null;
  messageCount: number;
  startedAt: Date;
  lastMessageAt: Date;
  firstUserMessage: string | null;
};

export type ConversationListResult = {
  items: ConversationListItem[];
  total: number;
};

export type ListConversationsArgs = {
  botId: string;
  q?: string;
  limit: number;
  offset: number;
};

export async function listConversations(
  args: ListConversationsArgs,
): Promise<ConversationListResult> {
  const { botId, q, limit, offset } = args;
  const trimmed = q?.trim() ?? "";

  const botFilter = eq(conversations.botId, botId);
  // Wrap the subquery in an explicit `sql` template so the ILIKE operator
  // has an unambiguously parenthesized scalar-subquery operand. Letting
  // Drizzle's `ilike()` helper handle a raw SQL template as its left
  // operand depends on dialect-internal wrapping behavior; the explicit
  // form is portable and grep-friendly.
  const pattern = `%${trimmed}%`;
  const searchFilter: SQL | undefined =
    trimmed.length > 0
      ? or(
          ilike(conversations.recruiterEmail, pattern),
          sql`(${FIRST_USER_MESSAGE_SQL}) ILIKE ${pattern}`,
        )
      : undefined;
  const where = searchFilter ? and(botFilter, searchFilter) : botFilter;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: conversations.id,
        sessionId: conversations.sessionId,
        recruiterEmail: conversations.recruiterEmail,
        messageCount: conversations.messageCount,
        startedAt: conversations.startedAt,
        lastMessageAt: conversations.lastMessageAt,
        firstUserMessage: FIRST_USER_MESSAGE_SQL,
      })
      .from(conversations)
      .where(where)
      .orderBy(desc(conversations.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(conversations)
      .where(where),
  ]);

  return { items: rows, total: totalRows[0]?.total ?? 0 };
}

export type ConversationTranscript = {
  id: string;
  sessionId: string;
  recruiterEmail: string | null;
  messageCount: number;
  startedAt: Date;
  lastMessageAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
};

export async function getConversationWithMessages(args: {
  botId: string;
  conversationId: string;
}): Promise<ConversationTranscript | null> {
  const { botId, conversationId } = args;

  const convo = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.botId, botId),
    ),
  });
  if (!convo) return null;

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt));

  return {
    id: convo.id,
    sessionId: convo.sessionId,
    recruiterEmail: convo.recruiterEmail,
    messageCount: convo.messageCount,
    startedAt: convo.startedAt,
    lastMessageAt: convo.lastMessageAt,
    messages: rows,
  };
}

// Cross-bot conversation feed for the dashboard home.
// Includes a first-user-message preview just like `listConversations`,
// plus the bot id/name so the dashboard can label each row with which
// bot the conversation belongs to.
export type UserConversationRow = {
  id: string;
  recruiterEmail: string | null;
  messageCount: number;
  startedAt: Date;
  firstUserMessage: string | null;
  botId: string;
  botName: string;
};

export async function listRecentConversationsForUser(args: {
  userId: string;
  limit: number;
}): Promise<UserConversationRow[]> {
  const { userId, limit } = args;
  return db
    .select({
      id: conversations.id,
      recruiterEmail: conversations.recruiterEmail,
      messageCount: conversations.messageCount,
      startedAt: conversations.startedAt,
      firstUserMessage: FIRST_USER_MESSAGE_SQL,
      botId: conversations.botId,
      botName: bots.name,
    })
    .from(conversations)
    .innerJoin(bots, eq(conversations.botId, bots.id))
    .where(eq(bots.userId, userId))
    .orderBy(desc(conversations.startedAt))
    .limit(limit);
}

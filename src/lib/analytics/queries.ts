import { eq, sql } from "drizzle-orm";

import { bots, conversations, db, leads, messages } from "@/lib/db";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type BotAnalytics = {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  conversationsThisMonth: number;
  leadsThisMonth: number;
};

export async function getAnalyticsForBot(botId: string): Promise<BotAnalytics> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [convoTotals, msgTotals, leadTotals] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${conversations.startedAt} >= ${since})::int`,
      })
      .from(conversations)
      .where(eq(conversations.botId, botId)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.botId, botId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${leads.capturedAt} >= ${since})::int`,
      })
      .from(leads)
      .where(eq(leads.botId, botId)),
  ]);

  return {
    totalConversations: convoTotals[0]?.total ?? 0,
    totalMessages: msgTotals[0]?.total ?? 0,
    totalLeads: leadTotals[0]?.total ?? 0,
    conversationsThisMonth: convoTotals[0]?.thisMonth ?? 0,
    leadsThisMonth: leadTotals[0]?.thisMonth ?? 0,
  };
}

export type UserAnalytics = {
  totalBots: number;
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  leadsThisMonth: number;
  conversationsThisWeek: number;
  conversationsPrevWeek: number;
  messagesThisWeek: number;
  messagesPrevWeek: number;
  leadsPrevMonth: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAnalyticsForUser(
  userId: string,
): Promise<UserAnalytics> {
  const now = Date.now();
  const since = new Date(now - THIRTY_DAYS_MS);
  const sinceTwoMonths = new Date(now - 2 * THIRTY_DAYS_MS);
  const sinceWeek = new Date(now - SEVEN_DAYS_MS);
  const sinceTwoWeeks = new Date(now - 2 * SEVEN_DAYS_MS);

  const [botTotals, convoTotals, msgTotals, leadTotals] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(bots)
      .where(eq(bots.userId, userId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${conversations.startedAt} >= ${sinceWeek})::int`,
        prevWeek: sql<number>`count(*) filter (where ${conversations.startedAt} >= ${sinceTwoWeeks} and ${conversations.startedAt} < ${sinceWeek})::int`,
      })
      .from(conversations)
      .innerJoin(bots, eq(conversations.botId, bots.id))
      .where(eq(bots.userId, userId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${messages.createdAt} >= ${sinceWeek})::int`,
        prevWeek: sql<number>`count(*) filter (where ${messages.createdAt} >= ${sinceTwoWeeks} and ${messages.createdAt} < ${sinceWeek})::int`,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(bots, eq(conversations.botId, bots.id))
      .where(eq(bots.userId, userId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${leads.capturedAt} >= ${since})::int`,
        prevMonth: sql<number>`count(*) filter (where ${leads.capturedAt} >= ${sinceTwoMonths} and ${leads.capturedAt} < ${since})::int`,
      })
      .from(leads)
      .innerJoin(bots, eq(leads.botId, bots.id))
      .where(eq(bots.userId, userId)),
  ]);

  return {
    totalBots: botTotals[0]?.total ?? 0,
    totalConversations: convoTotals[0]?.total ?? 0,
    totalMessages: msgTotals[0]?.total ?? 0,
    totalLeads: leadTotals[0]?.total ?? 0,
    leadsThisMonth: leadTotals[0]?.thisMonth ?? 0,
    conversationsThisWeek: convoTotals[0]?.thisWeek ?? 0,
    conversationsPrevWeek: convoTotals[0]?.prevWeek ?? 0,
    messagesThisWeek: msgTotals[0]?.thisWeek ?? 0,
    messagesPrevWeek: msgTotals[0]?.prevWeek ?? 0,
    leadsPrevMonth: leadTotals[0]?.prevMonth ?? 0,
  };
}

export function formatGrowth(
  current: number,
  previous: number,
): string | null {
  if (previous <= 0) return current > 0 ? "New" : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export type DailyCount = { date: string; count: number };

const MAX_DAILY_RANGE = 365;

export async function getDailyConversationCounts(args: {
  userId: string;
  days: number;
}): Promise<DailyCount[]> {
  const { userId } = args;
  const days = Math.min(MAX_DAILY_RANGE, Math.max(1, Math.floor(args.days)));
  const rows = await db.execute<{ date: string; count: string }>(sql`
    SELECT
      to_char(d::date, 'YYYY-MM-DD') AS date,
      COALESCE(c.count, 0)::text AS count
    FROM generate_series(
      (CURRENT_DATE - (${days - 1}::int)),
      CURRENT_DATE,
      '1 day'::interval
    ) AS d
    LEFT JOIN (
      SELECT date_trunc('day', ${conversations.startedAt})::date AS day,
             count(*) AS count
      FROM ${conversations}
      INNER JOIN ${bots} ON ${conversations.botId} = ${bots.id}
      WHERE ${bots.userId} = ${userId}
        AND ${conversations.startedAt} >= (CURRENT_DATE - (${days - 1}::int))
      GROUP BY 1
    ) c ON c.day = d::date
    ORDER BY d
  `);

  return rows.rows.map((r) => ({
    date: r.date,
    count: Number(r.count),
  }));
}

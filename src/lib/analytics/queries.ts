import { eq, sql } from "drizzle-orm";

import { bots, conversations, db, leads, messages } from "@/lib/db";

// Stage 6 shared analytics queries. Slice 6.2's `/api/bots/[botId]/analytics`
// route and slice 6.3's `/dashboard` + `/dashboard/bots/[botId]` pages all
// call into this module so the SQL lives in one place.
//
// Both functions use parallel small COUNTs scoped by `bot_id` / `user_id`
// rather than the plan's 4-way LEFT JOIN. The JOIN multiplies rows
// (cartesian product of conversations × messages × leads) before the SUMs
// aggregate them. Three small COUNTs each hit a small per-bot index slice
// and return one row.

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
};

// Aggregates across every bot owned by `userId`. Used by the dashboard
// home stat row.
export async function getAnalyticsForUser(
  userId: string,
): Promise<UserAnalytics> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [botTotals, convoTotals, msgTotals, leadTotals] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(bots)
      .where(eq(bots.userId, userId)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(conversations)
      .innerJoin(bots, eq(conversations.botId, bots.id))
      .where(eq(bots.userId, userId)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(bots, eq(conversations.botId, bots.id))
      .where(eq(bots.userId, userId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${leads.capturedAt} >= ${since})::int`,
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
  };
}

// Daily conversation counts for the last N days, scoped to a user.
// Powers the curvy line chart on the dashboard home. Postgres
// `date_trunc` rolls timestamps down to day boundaries; we emit one row
// per day even for zero-count days by left-joining a generated series
// so the chart doesn't have gaps in its X axis.
export type DailyCount = { date: string; count: number };

const MAX_DAILY_RANGE = 365;

export async function getDailyConversationCounts(args: {
  userId: string;
  days: number;
}): Promise<DailyCount[]> {
  const { userId } = args;
  // Clamp `days` defensively - a million-day request would generate a
  // million-row series in Postgres. The dashboard caller passes 7
  // today; the cap is generous (a year) while still bounded.
  const days = Math.min(MAX_DAILY_RANGE, Math.max(1, Math.floor(args.days)));
  // generate_series produces one row per day from N-days-ago to today,
  // and the left join attaches the conversation count for that day.
  // `COALESCE(count, 0)` ensures gap-free output.
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

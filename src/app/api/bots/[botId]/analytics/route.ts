import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { conversations, db, leads, messages } from "@/lib/db";

// GET /api/bots/[botId]/analytics
//
// Stage 6 §6.5: dashboard overview cards. Returns five integers:
// - totalConversations  : lifetime distinct conversations
// - totalMessages       : lifetime messages across all conversations
// - totalLeads          : lifetime captured leads
// - conversationsThisMonth : conversations started in the last 30 days
// - leadsThisMonth      : leads captured in the last 30 days
//
// Implementation note: we run three parallel COUNT queries (conversations,
// messages-via-join, leads) rather than the single 4-way LEFT JOIN from the
// plan. The plan's JOIN multiplies rows (one bot × many conversations ×
// many messages × many leads → cartesian explosion before the SUMs) which
// is correct but expensive; three small COUNTs hit the bot_id indexes and
// each return one row.

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [convoTotals, msgTotals, leadTotals] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${conversations.startedAt} >= ${since})::int`,
      })
      .from(conversations)
      .where(eq(conversations.botId, bot.id)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(
        conversations,
        eq(messages.conversationId, conversations.id),
      )
      .where(eq(conversations.botId, bot.id)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        thisMonth: sql<number>`count(*) filter (where ${leads.capturedAt} >= ${since})::int`,
      })
      .from(leads)
      .where(eq(leads.botId, bot.id)),
  ]);

  return NextResponse.json({
    totalConversations: convoTotals[0]?.total ?? 0,
    totalMessages: msgTotals[0]?.total ?? 0,
    totalLeads: leadTotals[0]?.total ?? 0,
    conversationsThisMonth: convoTotals[0]?.thisMonth ?? 0,
    leadsThisMonth: leadTotals[0]?.thisMonth ?? 0,
  });
}


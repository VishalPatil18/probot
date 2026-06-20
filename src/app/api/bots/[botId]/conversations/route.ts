import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { conversations, db, messages } from "@/lib/db";
import { parsePagination } from "@/lib/pagination";

// GET /api/bots/[botId]/conversations?page=1&limit=20&q=<search>
//
// Stage 6 §6.4: paginated conversation list for the dashboard. Each row
// includes a 200-char preview of the first user message so the dashboard
// can render "list with preview" without a second round-trip.
//
// Search: optional `?q=` does case-insensitive ILIKE on the recruiter
// email + the first-user-message preview. Both columns are indexed by bot,
// so the filter scans a small per-bot subset.

const PREVIEW_CHAR_LIMIT = 200;
const FIRST_USER_MESSAGE_SQL = sql<string | null>`(
  SELECT LEFT(${messages.content}, ${PREVIEW_CHAR_LIMIT})
  FROM ${messages}
  WHERE ${messages.conversationId} = ${conversations.id}
    AND ${messages.role} = 'user'
  ORDER BY ${messages.createdAt}
  LIMIT 1
)`;

export async function GET(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const url = new URL(request.url);
  const pag = parsePagination(url.searchParams);
  if (!pag.ok) return pag.response;
  const { page, limit, offset } = pag.pagination;

  const q = url.searchParams.get("q")?.trim() ?? "";

  const botFilter = eq(conversations.botId, bot.id);
  const searchFilter =
    q.length > 0
      ? or(
          ilike(conversations.recruiterEmail, `%${q}%`),
          ilike(FIRST_USER_MESSAGE_SQL, `%${q}%`),
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

  return NextResponse.json({
    items: rows,
    total: totalRows[0]?.total ?? 0,
    page,
    limit,
  });
}

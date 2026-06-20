import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";
import { parsePagination } from "@/lib/pagination";

// GET /api/notifications?unread=true&page=1&limit=20
//
// Stage 6 §6.6: paginated notification feed for the dashboard bell. The
// optional `?unread=true` filter narrows to unread rows so the bell-list
// dropdown can cheaply show "what's new since I last looked." The slice-
// 6.1 partial index `notifications_user_unread_idx` covers that query.
//
// Always returns the unread count too — the bell badge polls
// /unread-count for cheap updates, but the list response includes the
// count so the dropdown can render the badge in sync without a second
// round-trip.

export async function GET(request: Request): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId } = session;

  const url = new URL(request.url);
  const pag = parsePagination(url.searchParams);
  if (!pag.ok) return pag.response;
  const { page, limit, offset } = pag.pagination;

  const unreadOnly = url.searchParams.get("unread") === "true";

  const baseFilter = eq(notifications.userId, userId);
  const where = unreadOnly
    ? and(baseFilter, isNull(notifications.readAt))
    : baseFilter;

  const [items, totalRows, unreadRows] = await Promise.all([
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        botId: notifications.botId,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(where),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(baseFilter, isNull(notifications.readAt))),
  ]);

  return NextResponse.json({
    items,
    total: totalRows[0]?.total ?? 0,
    page,
    limit,
    unreadCount: unreadRows[0]?.unread ?? 0,
  });
}

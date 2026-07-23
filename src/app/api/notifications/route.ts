import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications, users } from "@/lib/db";
import { parsePagination } from "@/lib/pagination";

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

  const [items, totalRows, unreadRows, userPref] = await Promise.all([
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
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { notifyLeadsEmail: true },
    }),
  ]);

  return NextResponse.json({
    items,
    notifyLeadsEmail: userPref?.notifyLeadsEmail ?? false,
    total: totalRows[0]?.total ?? 0,
    page,
    limit,
    unreadCount: unreadRows[0]?.unread ?? 0,
  });
}

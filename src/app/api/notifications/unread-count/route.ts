import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

// GET /api/notifications/unread-count
//
// Lightweight polling target. The dashboard bell calls this
// every 30 seconds and renders `{ count }` as the unread badge number.
// Hits the partial index `notifications_user_unread_idx` so the query
// scans only currently-unread rows for the user - typically O(<50) rows.

export async function GET(): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId } = session;

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return NextResponse.json({ count: rows[0]?.count ?? 0 });
}

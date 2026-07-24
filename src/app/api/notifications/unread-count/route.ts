import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

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

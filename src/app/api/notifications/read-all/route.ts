import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

export async function POST(): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId } = session;

  const now = new Date();
  const updated = await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    )
    .returning({ id: notifications.id });

  return NextResponse.json({ markedRead: updated.length });
}

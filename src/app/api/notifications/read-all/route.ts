import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

// POST /api/notifications/read-all
//
// Stage 6 §6.6: bulk-clear the bell badge. UPDATE every still-unread
// notification for the user in one statement. Returns the count of rows
// affected so the dashboard can pre-flip its local unread state without
// a follow-up GET /unread-count round-trip.

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

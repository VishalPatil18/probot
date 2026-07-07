import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

// DELETE /api/notifications/delete-all
//
// Bulk hard-delete every notification for the caller. Mirror of the
// existing read-all POST pattern - one statement, scoped by user_id, no
// separate SELECT. Returns the number of deleted rows so the inbox can
// pre-flip its local list without a follow-up GET.

export async function DELETE(): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId } = session;

  const deleted = await db
    .delete(notifications)
    .where(eq(notifications.userId, userId))
    .returning({ id: notifications.id });

  return NextResponse.json({ deleted: deleted.length });
}

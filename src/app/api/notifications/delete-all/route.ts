import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

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

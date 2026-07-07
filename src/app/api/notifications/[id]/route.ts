import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { db, notifications } from "@/lib/db";

// DELETE /api/notifications/[id]
//
// Hard-delete a single notification. Ownership check is embedded in the
// WHERE clause (`AND user_id = session.user.id`) - one statement, no
// separate SELECT. A 0-row delete means either the notification doesn't
// exist OR it belongs to another user; both surface as 404 so we don't leak
// existence across the tenancy boundary.

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId } = session;

  if (!UUID_REGEX.test(params.id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const deleted = await db
    .delete(notifications)
    .where(
      and(eq(notifications.id, params.id), eq(notifications.userId, userId)),
    )
    .returning({ id: notifications.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ id: params.id });
}

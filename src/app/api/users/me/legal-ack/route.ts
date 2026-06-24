import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";

// POST /api/users/me/legal-ack - record that the user acknowledged the current
// legal effective date. Sets last_legal_ack_date to now so the dashboard ToS
// banner stops showing (until LEGAL_EFFECTIVE_AT is bumped again).

export async function POST(): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await db
    .update(users)
    .set({ lastLegalAckDate: new Date() })
    .where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}

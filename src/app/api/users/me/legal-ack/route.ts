import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";

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

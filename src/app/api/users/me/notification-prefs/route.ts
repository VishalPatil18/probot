import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";

// GET / PATCH /api/users/me/notification-prefs - the signed-in user's
// notification preferences. Currently a single flag: email me when a new lead
// is captured (off by default). Backs the toggle in the notification dropdown.

const prefsInput = z.object({
  notifyLeadsEmail: z.boolean(),
});

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { notifyLeadsEmail: true },
  });
  return NextResponse.json({
    notifyLeadsEmail: row?.notifyLeadsEmail ?? false,
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = prefsInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ notifyLeadsEmail: parsed.data.notifyLeadsEmail })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ notifyLeadsEmail: parsed.data.notifyLeadsEmail });
}

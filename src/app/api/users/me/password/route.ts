import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { db, users } from "@/lib/db";
import { passwordChangeInput } from "@/lib/users/profile-schemas";

// POST /api/users/me/password - change the signed-in user's password. Requires
// the current password. OAuth/magic-link accounts have no password set and
// cannot use this path (they would need a "set password" flow instead).

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = passwordChangeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { hashedPassword: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  if (!user.hashedPassword) {
    return NextResponse.json({ error: "no_password_set" }, { status: 400 });
  }

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    user.hashedPassword,
  );
  if (!ok) {
    return NextResponse.json(
      { error: "invalid_current_password" },
      { status: 400 },
    );
  }

  const hashedPassword = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ hashedPassword }).where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}

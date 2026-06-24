import { and, eq, ne } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";
import { profileUpdateInput } from "@/lib/users/profile-schemas";

// PATCH /api/users/me/profile - update the signed-in user's full name and
// username. Email is intentionally not editable here. Username uniqueness is
// pre-checked and backstopped by the UNIQUE constraint (23505 -> 409).

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

export async function PATCH(request: Request): Promise<Response> {
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

  const parsed = profileUpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, username } = parsed.data;

  const taken = await db.query.users.findFirst({
    where: and(eq(users.username, username), ne(users.id, userId)),
    columns: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  try {
    await db
      .update(users)
      .set({ name: name.length > 0 ? name : null, username })
      .where(eq(users.id, userId));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ user: { id: userId, name, username } });
}

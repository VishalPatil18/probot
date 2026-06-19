import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/passwords";
import { registerInput } from "@/lib/auth/schemas";
import { pickDefaultAvatar } from "@/lib/avatars";
import { db, users } from "@/lib/db";

// Postgres unique_violation code - emitted by the UNIQUE constraints on
// users.username / users.email if a row sneaks in between the pre-check and
// the INSERT. We translate it back to a 409 rather than leaking a 500.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { username, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
    columns: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json(
      { error: `A user with this ${field} already exists` },
      { status: 409 },
    );
  }

  const hashedPassword = await hashPassword(password);

  try {
    // Stage 4: every new account gets a deterministic animal-icon avatar so
    // the public chat page (and dashboard hero) always render a face. The
    // user can change it in the onboarding flow (Stage 4) or in Stage 7
    // settings.
    const image = pickDefaultAvatar(username);
    const [created] = await db
      .insert(users)
      .values({ username, email, hashedPassword, image })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
      });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

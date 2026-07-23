import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { sendEmailVerificationEmail } from "@/lib/auth/email";
import { createVerificationToken } from "@/lib/auth/email-verification";
import { hashPassword } from "@/lib/auth/passwords";
import { registerInput } from "@/lib/auth/schemas";
import { buildTokenUrl } from "@/lib/auth/tokens";
import { pickDefaultAvatar } from "@/lib/avatars";
import { db, users } from "@/lib/db";

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

  let createdUserId: string;
  try {
    const image = pickDefaultAvatar(username);
    const [created] = await db
      .insert(users)
      .values({ username, email, hashedPassword, image })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
      });
    if (!created) {
      throw new Error("Insert returned no row");
    }
    createdUserId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  const { rawToken } = await createVerificationToken(createdUserId);
  const url = buildTokenUrl({ path: "/auth/verify-email", token: rawToken });
  try {
    await sendEmailVerificationEmail({ to: email, url });
  } catch {
    return NextResponse.json(
      {
        user: { id: createdUserId, username, email },
        verificationEmailSent: false,
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      user: { id: createdUserId, username, email },
      verificationEmailSent: true,
    },
    { status: 201 },
  );
}

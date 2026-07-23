import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/auth/email";
import { createResetToken } from "@/lib/auth/password-reset";
import { forgotPasswordInput } from "@/lib/auth/schemas";
import { buildTokenUrl } from "@/lib/auth/tokens";
import { db, users } from "@/lib/db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = forgotPasswordInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, hashedPassword: true },
  });

  if (user && user.hashedPassword) {
    const { rawToken } = await createResetToken(user.id);
    const url = buildTokenUrl({
      path: "/reset-password",
      token: rawToken,
    });
    try {
      await sendPasswordResetEmail({ to: email, url });
    } catch {
    }
  }

  return NextResponse.json({ ok: true });
}

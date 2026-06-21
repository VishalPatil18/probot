import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { validateAndConsumeToken } from "@/lib/auth/password-reset";
import { hashPassword } from "@/lib/auth/passwords";
import { resetPasswordInput } from "@/lib/auth/schemas";
import { db, users } from "@/lib/db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resetPasswordInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const result = await validateAndConsumeToken(token);
  if (!result.valid) {
    const message =
      result.reason === "expired"
        ? "This reset link has expired. Request a new one."
        : "This reset link is invalid or has already been used.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const hashedPassword = await hashPassword(password);
  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, result.userId));

  return NextResponse.json({ ok: true });
}

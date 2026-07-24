import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { usernameSchema } from "@/lib/auth/schemas";
import { db, users } from "@/lib/db";

const emailField = z.string().email().max(255);

interface FieldResult {
  available: boolean;
  reason?: string;
}

async function checkUsername(raw: string): Promise<FieldResult> {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      available: false,
      reason: parsed.error.issues[0]?.message ?? "Invalid username",
    };
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.username, parsed.data),
    columns: { id: true },
  });
  return existing
    ? { available: false, reason: "This username is taken" }
    : { available: true };
}

async function checkEmail(raw: string): Promise<FieldResult> {
  const parsed = emailField.safeParse(raw);
  if (!parsed.success) {
    return { available: false, reason: "Invalid email address" };
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data),
    columns: { id: true },
  });
  return existing
    ? { available: false, reason: "An account with this email exists" }
    : { available: true };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const email = searchParams.get("email");

  if (username === null && email === null) {
    return NextResponse.json(
      { error: "Provide a username or email to check" },
      { status: 400 },
    );
  }

  const body: { username?: FieldResult; email?: FieldResult } = {};
  if (username !== null) {
    body.username = await checkUsername(username);
  }
  if (email !== null) {
    body.email = await checkEmail(email);
  }

  return NextResponse.json(body);
}

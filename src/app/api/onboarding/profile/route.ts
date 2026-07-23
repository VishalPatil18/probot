import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { usernameSchema } from "@/lib/auth/schemas";
import { isAllowedAvatar } from "@/lib/avatars";
import { db, users } from "@/lib/db";

const profileInput = z.object({
  username: usernameSchema,
  image: z.string().url().max(2000),
});

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

  const parsed = profileInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { image: true, username: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const imageOk =
    isAllowedAvatar(parsed.data.image) || parsed.data.image === existing.image;
  if (!imageOk) {
    return NextResponse.json({ error: "invalid_avatar" }, { status: 400 });
  }

  try {
    await db
      .update(users)
      .set({
        username: parsed.data.username,
        image: parsed.data.image,
      })
      .where(eq(users.id, userId));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({
    user: {
      id: userId,
      username: parsed.data.username,
      image: parsed.data.image,
    },
  });
}

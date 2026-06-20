import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { usernameSchema } from "@/lib/auth/schemas";
import { isAllowedAvatar } from "@/lib/avatars";
import { db, users } from "@/lib/db";

// Stage 4 plan.md §4: PATCH /api/onboarding/profile
//
// Single-shot endpoint that finalises a user's identity. Used by the
// /onboarding page to (a) replace a `user-<8hex>` placeholder username with
// a user-chosen slug and (b) replace the auto-assigned animal avatar with a
// user-chosen one. Both fields are required so the endpoint has a single
// success shape; clients that want to update only one field re-send the
// existing value for the other.

const profileInput = z.object({
  username: usernameSchema,
  image: z.string().url().max(2000),
});

// Postgres unique_violation code. Same defense-in-depth as register route -
// even with the pre-check, two concurrent PATCHes could race past it.
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

  // Avatar allowlist: the URL must either be one of the curated animal
  // icons OR equal to the user's current `users.image` (preserves OAuth
  // provider avatars like a Google/GitHub photo without proxying arbitrary
  // URLs from the wire).
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

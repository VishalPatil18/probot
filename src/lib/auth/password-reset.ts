import { and, eq, isNull, lt } from "drizzle-orm";

import { db, passwordResetTokens } from "@/lib/db";

import { generateRawToken, hashToken } from "./tokens";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CreateResult {
  rawToken: string;
  expiresAt: Date;
}

export async function createResetToken(userId: string): Promise<CreateResult> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export type ValidateResult =
  | { valid: true; userId: string }
  | { valid: false; reason: "not_found" | "expired" | "used" };

export async function validateAndConsumeToken(
  rawToken: string,
): Promise<ValidateResult> {
  const tokenHash = hashToken(rawToken);
  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
  });

  if (!row) {
    return { valid: false, reason: "not_found" };
  }
  if (row.usedAt) {
    return { valid: false, reason: "used" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  // Mark used in the same transaction-equivalent guard. We rely on the
  // unique index on token_hash + the WHERE used_at IS NULL clause so two
  // concurrent consumes both can't succeed.
  const updated = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.id, row.id),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .returning({ id: passwordResetTokens.id });

  if (updated.length === 0) {
    return { valid: false, reason: "used" };
  }

  return { valid: true, userId: row.userId };
}

export async function pruneExpiredResetTokens(): Promise<void> {
  await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()));
}

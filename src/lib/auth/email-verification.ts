import { eq, lt } from "drizzle-orm";

import { db, emailVerificationTokens, users } from "@/lib/db";

import { generateRawToken, hashToken } from "./tokens";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

interface CreateResult {
  rawToken: string;
  expiresAt: Date;
}

export async function createVerificationToken(
  userId: string,
): Promise<CreateResult> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "expired" };

export async function verifyAndConsumeToken(
  rawToken: string,
): Promise<VerifyResult> {
  const tokenHash = hashToken(rawToken);
  const row = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.tokenHash, tokenHash),
  });

  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, row.id));
    return { ok: false, reason: "expired" };
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, row.userId));

  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, row.id));

  return { ok: true, userId: row.userId };
}

export async function pruneExpiredVerificationTokens(): Promise<void> {
  await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()));
}

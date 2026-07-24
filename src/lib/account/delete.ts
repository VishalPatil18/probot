import { and, eq, isNotNull, lte } from "drizzle-orm";

import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { db, deletionRequests, users } from "@/lib/db";

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const POST_PURGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type InitDeletionResult =
  | {
      ok: true;
      scheduledPurgeAt: Date;
      rawUndoToken: string;
      emailSnapshot: string;
    }
  | {
      ok: false;
      reason: "username_mismatch" | "already_requested" | "user_not_found";
    };

export async function initiateAccountDeletion(
  userId: string,
  typedUsername: string,
): Promise<InitDeletionResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, username: true, email: true },
  });
  if (!user) {
    return { ok: false, reason: "user_not_found" };
  }
  if (typedUsername !== user.username) {
    return { ok: false, reason: "username_mismatch" };
  }

  const existing = await db.query.deletionRequests.findFirst({
    where: eq(deletionRequests.userId, userId),
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, reason: "already_requested" };
  }

  const rawUndoToken = generateRawToken();
  const undoTokenHash = hashToken(rawUndoToken);
  const now = new Date();
  const scheduledPurgeAt = new Date(now.getTime() + GRACE_PERIOD_MS);

  await db.insert(deletionRequests).values({
    userId,
    emailSnapshot: user.email,
    usernameSnapshot: user.username,
    confirmationUsername: typedUsername,
    undoTokenHash,
    requestedAt: now,
    scheduledPurgeAt,
  });

  return {
    ok: true,
    scheduledPurgeAt,
    rawUndoToken,
    emailSnapshot: user.email,
  };
}

export type UndoDeletionResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "username_mismatch" | "already_purged" };

export async function undoAccountDeletion(
  rawToken: string,
  identifier: string,
): Promise<UndoDeletionResult> {
  const undoTokenHash = hashToken(rawToken);
  const row = await db.query.deletionRequests.findFirst({
    where: eq(deletionRequests.undoTokenHash, undoTokenHash),
  });
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.purgedAt !== null) {
    return { ok: false, reason: "already_purged" };
  }
  const typed = identifier.trim();
  const matches =
    typed === row.usernameSnapshot ||
    typed.toLowerCase() === row.emailSnapshot.toLowerCase();
  if (!matches) {
    return { ok: false, reason: "username_mismatch" };
  }

  await db.delete(deletionRequests).where(eq(deletionRequests.id, row.id));
  return { ok: true, userId: row.userId };
}

export interface DeletionPendingInfo {
  scheduledPurgeAt: Date;
  requestedAt: Date;
}

export async function getPendingDeletion(
  userId: string,
): Promise<DeletionPendingInfo | null> {
  const row = await db.query.deletionRequests.findFirst({
    where: eq(deletionRequests.userId, userId),
    columns: { scheduledPurgeAt: true, requestedAt: true, purgedAt: true },
  });
  if (!row || row.purgedAt !== null) return null;
  return {
    scheduledPurgeAt: row.scheduledPurgeAt,
    requestedAt: row.requestedAt,
  };
}

export interface PurgeJobResult {
  purgedCount: number;
  completionEmailsSent: number;
  rowsCleanedUp: number;
}

export interface PurgeJobDeps {
  sendCompletionEmail: (args: {
    to: string;
    username: string;
  }) => Promise<void>;
  pruneAuditLogs: () => Promise<void>;
}

export async function runPurgeJob(
  deps: PurgeJobDeps,
): Promise<PurgeJobResult> {
  const now = new Date();
  let purgedCount = 0;
  let completionEmailsSent = 0;
  let rowsCleanedUp = 0;

  const due = await db.query.deletionRequests.findMany({
    where: and(
      lte(deletionRequests.scheduledPurgeAt, now),
    ),
  });

  for (const row of due) {
    if (row.purgedAt !== null) continue;

    await db
      .update(deletionRequests)
      .set({ purgedAt: now })
      .where(eq(deletionRequests.id, row.id));

    await db.delete(users).where(eq(users.id, row.userId));
    purgedCount += 1;

    try {
      await deps.sendCompletionEmail({
        to: row.emailSnapshot,
        username: row.usernameSnapshot,
      });
      completionEmailsSent += 1;
    } catch {
    }
  }

  const retentionCutoff = new Date(now.getTime() - POST_PURGE_RETENTION_MS);
  const cleaned = await db
    .delete(deletionRequests)
    .where(
      and(
        isNotNull(deletionRequests.purgedAt),
        lte(deletionRequests.purgedAt, retentionCutoff),
      ),
    )
    .returning({ id: deletionRequests.id });
  rowsCleanedUp = cleaned.length;

  try {
    await deps.pruneAuditLogs();
  } catch {
  }

  return { purgedCount, completionEmailsSent, rowsCleanedUp };
}

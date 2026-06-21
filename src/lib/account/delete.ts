import { and, eq, isNotNull, lte } from "drizzle-orm";

import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { db, deletionRequests, users } from "@/lib/db";

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// After purge runs we keep the deletion_requests row for a short window so
// the next cron iteration can deliver the completion email - then it's
// safe to drop the row entirely.
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

// Stage 7 Phase 5: kick off the 7-day grace period. The user has clicked
// "Delete account" + typed their username in the GitHub-style modal; the
// route hands the typed value here so we can re-verify against the live
// users row (defence in depth - the dashboard's own confirmation is the
// first check). Returns the raw undo token so the route can include it in
// the email link; the token is stored hashed in the row.
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

  // Block double-init: an existing row means a deletion is already
  // scheduled. The user should use the undo link (or contact support)
  // rather than firing the email again.
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

// The user clicked the undo link in the email and typed their username on
// the undo-deletion page. We validate the token, re-check the username
// (same defence-in-depth as init), then drop the row - cancelling the
// scheduled purge.
export async function undoAccountDeletion(
  rawToken: string,
  typedUsername: string,
): Promise<UndoDeletionResult> {
  const undoTokenHash = hashToken(rawToken);
  const row = await db.query.deletionRequests.findFirst({
    where: eq(deletionRequests.undoTokenHash, undoTokenHash),
  });
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.purgedAt !== null) {
    // The grace period elapsed and the cron already deleted the user.
    // Undo cannot recover from this - the user data is gone.
    return { ok: false, reason: "already_purged" };
  }
  if (typedUsername !== row.usernameSnapshot) {
    return { ok: false, reason: "username_mismatch" };
  }

  await db.delete(deletionRequests).where(eq(deletionRequests.id, row.id));
  return { ok: true, userId: row.userId };
}

export interface DeletionPendingInfo {
  scheduledPurgeAt: Date;
  requestedAt: Date;
}

// Used by the dashboard to surface the "your account is scheduled for
// deletion in N days - undo here" banner. Returns null when there's no
// pending request.
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
  // Allows the cron route to swap a no-op (in tests) or a real sender
  // implementation without the module-under-test importing Resend.
  sendCompletionEmail: (args: {
    to: string;
    username: string;
  }) => Promise<void>;
  pruneAuditLogs: () => Promise<void>;
}

// Idempotent purge job. The deletion_requests row is declared with
// ON DELETE CASCADE from users, so deleting the user will also drop the
// request row. That's fine - the completion email reads its recipient
// from the row snapshot held in this function's loop variable BEFORE
// the cascade fires, so the snapshot survives even though the DB row
// doesn't. The two remaining passes (legacy-row cleanup, audit-log
// pruning) are defence-in-depth / hygiene only.
export async function runPurgeJob(
  deps: PurgeJobDeps,
): Promise<PurgeJobResult> {
  const now = new Date();
  let purgedCount = 0;
  let completionEmailsSent = 0;
  let rowsCleanedUp = 0;

  // Pass 1: find every row past its scheduled purge time, snapshot the
  // contact info, send the completion email, then delete the user (which
  // CASCADEs through every owned row including the deletion_requests row
  // itself). Email-send failures are caught per-row so one bad recipient
  // doesn't strand the whole batch.
  const due = await db.query.deletionRequests.findMany({
    where: and(
      lte(deletionRequests.scheduledPurgeAt, now),
      // purged_at IS NULL means "not yet purged" - we want those rows.
      // Drizzle has no direct isNull operator imported here, so we use
      // a raw check via the schema.
    ),
  });

  for (const row of due) {
    if (row.purgedAt !== null) continue;

    // Mark purged FIRST so the completion email pass below sees the row
    // in a "purged" state. The CASCADE on user-delete will drop the
    // deletion_requests row anyway; the email pass uses the snapshot
    // values from the in-memory loop variable, not a re-read.
    await db
      .update(deletionRequests)
      .set({ purgedAt: now })
      .where(eq(deletionRequests.id, row.id));

    // Now delete the user. CASCADE drops bots, knowledge, conversations,
    // messages, leads, encrypted_llm_keys, decrypt_audit_log, AND the
    // deletion_requests row we just updated. After this point only the
    // snapshot in `row` survives.
    await db.delete(users).where(eq(users.id, row.userId));
    purgedCount += 1;

    // Send the completion email from the snapshot. Best-effort; failures
    // don't roll back the purge (user data is gone, the email is a
    // courtesy).
    try {
      await deps.sendCompletionEmail({
        to: row.emailSnapshot,
        username: row.usernameSnapshot,
      });
      completionEmailsSent += 1;
    } catch {
      // Silent - operator can re-run the email separately if a sender
      // outage caused this. We already deleted the user; rolling back
      // would mean restoring backups.
    }
  }

  // Pass 2: any deletion_requests row with purged_at older than the
  // retention window that somehow wasn't cascaded (legacy / manual
  // backfill / future refactor). Drop them.
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

  // Pass 3: prune ancillary expired data (Stage 7 audit log keeps 30
  // days; the cron is the right place for the actual DELETE since reads
  // already enforce the window).
  try {
    await deps.pruneAuditLogs();
  } catch {
    // Audit-log pruning is hygiene, not correctness.
  }

  return { purgedCount, completionEmailsSent, rowsCleanedUp };
}

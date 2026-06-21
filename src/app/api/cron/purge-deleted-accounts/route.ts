import { NextResponse } from "next/server";

import { runPurgeJob } from "@/lib/account/delete";
import { pruneOldAuditLogs } from "@/lib/account/prune-audit-log";
import { sendDeletionCompleteEmail } from "@/lib/auth/email";

// GET /api/cron/purge-deleted-accounts
//
// Vercel Cron hits this once a day (see vercel.json). The cron handler:
//   1. Permanently deletes any user whose 7-day grace has elapsed,
//      sending a completion email from the snapshot the deletion_requests
//      row preserved at init time.
//   2. Cleans up any orphaned tombstone rows past the retention window.
//   3. Prunes the decrypt_audit_log to its 30-day retention.
//
// Authentication: Vercel Cron sets `Authorization: Bearer $CRON_SECRET`.
// We compare against the env var; any mismatch (or missing env var) 401s.
// This prevents anyone on the public internet from triggering the purge.

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length === 0) {
    // Fail-closed: if the operator hasn't set CRON_SECRET, refuse to run.
    // Better to skip a cron tick than to expose a destructive endpoint
    // to the open internet.
    return NextResponse.json(
      { error: "cron_secret_unset" },
      { status: 503 },
    );
  }
  const supplied = request.headers.get("authorization") ?? "";
  if (supplied !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPurgeJob({
    sendCompletionEmail: ({ to, username }) =>
      sendDeletionCompleteEmail({ to, username }),
    pruneAuditLogs: async () => {
      await pruneOldAuditLogs();
    },
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

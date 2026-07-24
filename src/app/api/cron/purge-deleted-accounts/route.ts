import { NextResponse } from "next/server";

import { runPurgeJob } from "@/lib/account/delete";
import { pruneOldAuditLogs } from "@/lib/account/prune-audit-log";
import { sendDeletionCompleteEmail } from "@/lib/auth/email";

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length === 0) {
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

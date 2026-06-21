import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { initiateAccountDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";
import { sendDeletionInitiatedEmail } from "@/lib/auth/email";
import { buildTokenUrl } from "@/lib/auth/tokens";

// POST /api/users/me/delete
//
// Stage 7 Phase 5 §NFR-C01/C05. Initiates the 7-day deletion grace
// period. The client (DeleteAccountModal) collected a username retype as
// a GitHub-style confirmation; we re-validate it server-side before
// scheduling. On success, sends the user an email containing an undo link
// they can click within 7 days to cancel.
//
// Idempotent: re-submitting while a deletion is already pending returns
// `already_requested` rather than scheduling a second purge or resending
// the email. (Resending the email is a future Phase 6 polish - "I lost
// the link, send me a new one.")

const deleteInput = z.object({
  username: z.string().min(1).max(30),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = deleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed" },
      { status: 400 },
    );
  }

  const result = await initiateAccountDeletion(
    session.user.id,
    parsed.data.username,
  );
  if (!result.ok) {
    if (result.reason === "username_mismatch") {
      return NextResponse.json(
        { error: "username_mismatch" },
        { status: 400 },
      );
    }
    if (result.reason === "already_requested") {
      return NextResponse.json(
        { error: "already_requested" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // Best-effort email send. The grace period and undo flow still work if
  // the email never makes it out; the dashboard banner (Phase 6) will
  // also expose the deletion request, and the user can use the in-app
  // "Cancel deletion" button instead of the email link.
  try {
    const undoUrl = buildTokenUrl({
      path: "/undo-deletion",
      token: result.rawUndoToken,
    });
    await sendDeletionInitiatedEmail({
      to: result.emailSnapshot,
      url: undoUrl,
      scheduledPurgeAt: result.scheduledPurgeAt,
    });
  } catch {
    // Swallow - the deletion request is recorded; the user can still
    // undo via the dashboard banner.
  }

  return NextResponse.json({
    ok: true,
    scheduledPurgeAt: result.scheduledPurgeAt.toISOString(),
  });
}

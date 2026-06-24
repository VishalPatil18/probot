import { NextResponse } from "next/server";
import { z } from "zod";

import { undoAccountDeletion } from "@/lib/account/delete";

// POST /api/users/me/undo-deletion
//
// Cancel a pending account deletion. The user clicks the
// link in the initiation email, lands on /undo-deletion, types their
// username to confirm, and the form POSTs here. No session required - the
// undo token is the authentication (it's emailed only to the account
// owner). The typed-username re-check is the same defence-in-depth used
// at delete-init time.

const undoInput = z.object({
  token: z.string().min(32).max(128),
  // Either the username or the account email confirms the undo.
  identifier: z.string().trim().min(1).max(255),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = undoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed" },
      { status: 400 },
    );
  }

  const result = await undoAccountDeletion(
    parsed.data.token,
    parsed.data.identifier,
  );
  if (!result.ok) {
    if (result.reason === "username_mismatch") {
      return NextResponse.json(
        { error: "username_mismatch" },
        { status: 400 },
      );
    }
    if (result.reason === "already_purged") {
      return NextResponse.json(
        { error: "already_purged" },
        { status: 410 },
      );
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { initiateAccountDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";
import { sendDeletionInitiatedEmail } from "@/lib/auth/email";
import { buildTokenUrl } from "@/lib/auth/tokens";

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
  }

  return NextResponse.json({
    ok: true,
    scheduledPurgeAt: result.scheduledPurgeAt.toISOString(),
  });
}

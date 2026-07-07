import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { purgeUserData } from "@/lib/account/purge-data";

// POST /api/users/me/purge-data
//
// Deletes every bot (and everything that cascades off it: knowledge base,
// conversations, messages, leads, tokens, encrypted keys) plus notifications
// for the signed-in user. Leaves the user account itself untouched so the
// user can start fresh without re-registering.
//
// Requires the caller to type their username in the confirm modal so a
// mistaken click can't wipe an active setup. The check happens against the
// current session (never trusts a `userId` from the body).

const schema = z.object({
  username: z.string().min(1).max(64),
});

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { userId, username } = session;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  if (parsed.data.username.trim() !== username) {
    return NextResponse.json(
      { error: "username_mismatch" },
      { status: 400 },
    );
  }

  const summary = await purgeUserData(userId);
  return NextResponse.json({ deleted: summary });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";

// Parallel to `requireBotOwner` but for session-only routes (notifications,
// account-scoped operations). Returns a discriminated union so the caller
// can `return result.response` on failure without exception detour.
export type RequireSessionResult =
  | { ok: true; userId: string; username: string }
  | { ok: false; response: NextResponse };

export async function requireSession(): Promise<RequireSessionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    userId: session.user.id,
    username: session.user.username,
  };
}

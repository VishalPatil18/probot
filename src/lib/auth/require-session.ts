import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";

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

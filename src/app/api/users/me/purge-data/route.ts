import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { purgeUserData } from "@/lib/account/purge-data";

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

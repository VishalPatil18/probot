import { NextResponse } from "next/server";
import { z } from "zod";

import { undoAccountDeletion } from "@/lib/account/delete";

const undoInput = z.object({
  token: z.string().min(32).max(128),
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

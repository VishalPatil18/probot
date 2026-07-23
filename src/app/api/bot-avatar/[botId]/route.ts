import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { botAvatars, db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const row = await db.query.botAvatars.findFirst({
    where: eq(botAvatars.botId, params.botId),
    columns: { data: true, contentType: true },
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}

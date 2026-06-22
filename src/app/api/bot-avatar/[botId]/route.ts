import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { botAvatars, db } from "@/lib/db";

// GET /api/bot-avatar/[botId] - public serve route for database-stored bot
// pictures. `bots.image` points here for bots with an uploaded photo; the
// public chat header and embeddable widget render it directly. Bots on the
// default ProBot icon have no row here and never hit this route.

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

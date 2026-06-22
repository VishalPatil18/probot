import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, userAvatars } from "@/lib/db";

// GET /api/avatar/[userId] - public serve route for database-stored profile
// photos. `users.image` points here for users who uploaded a custom photo;
// the public chat page and dashboard render it directly. Default avatars are
// plain Cloudinary URLs and never reach this route.

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
): Promise<Response> {
  const row = await db.query.userAvatars.findFirst({
    where: eq(userAvatars.userId, params.userId),
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

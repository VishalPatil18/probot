import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { buildExportBundle } from "@/lib/account/export";
import { authOptions } from "@/lib/auth/auth";

// GET /api/users/me/export
//
// Stage 7 Phase 5 §NFR-C04: portable JSON dump of every row about the
// signed-in user. Streamed with a `Content-Disposition: attachment`
// header so browsers offer a save dialog rather than rendering JSON in a
// new tab. The filename is `probot-export-<timestamp>.json` so a user
// who exports repeatedly doesn't accidentally overwrite an older copy.

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bundle;
  try {
    bundle = await buildExportBundle(session.user.id);
  } catch {
    return NextResponse.json(
      { error: "export_failed" },
      { status: 500 },
    );
  }

  const filename = `probot-export-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}.json`;

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

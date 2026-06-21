import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { bots, db } from "@/lib/db";

// POST /api/bots/[botId]/publish
//
// Stage 7 §FR-002.10: flips a draft bot to live. Clears the preview_token so
// the now-public bot can't also be reached via the (no-longer-relevant)
// preview URL. The reverse direction (publish → unpublish) is the existing
// PATCH endpoint's `isActive: false` path; we deliberately do NOT remint a
// preview token on unpublish - the dashboard already gates access via the
// session cookie, so previewing your own paused bot is allowed at the
// public URL with no token shenanigans needed (the chat route's preview
// path is for tokens; the dashboard test chat path uses the creator session
// directly when added in Phase 6).
export async function POST(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  if (bot.isActive) {
    // Already published - idempotent success rather than 409 so a double-tap
    // on the Publish button doesn't surface a confusing error.
    return NextResponse.json({ bot: { id: bot.id, isActive: true } });
  }

  const [updated] = await db
    .update(bots)
    .set({ isActive: true, previewToken: null })
    .where(eq(bots.id, bot.id))
    .returning({
      id: bots.id,
      isActive: bots.isActive,
    });

  return NextResponse.json({ bot: updated });
}

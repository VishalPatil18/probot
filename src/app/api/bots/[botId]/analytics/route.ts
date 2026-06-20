import { NextResponse } from "next/server";

import { getAnalyticsForBot } from "@/lib/analytics/queries";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

// GET /api/bots/[botId]/analytics
//
// Stage 6 §6.5: dashboard overview cards. Returns the five-metric snapshot
// computed by `getAnalyticsForBot` - shared with the slice-6.3 RSC pages
// so the SQL lives in one place.

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const analytics = await getAnalyticsForBot(owner.bot.id);
  return NextResponse.json(analytics);
}

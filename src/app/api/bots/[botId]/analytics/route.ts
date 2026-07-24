import { NextResponse } from "next/server";

import { getAnalyticsForBot } from "@/lib/analytics/queries";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const analytics = await getAnalyticsForBot(owner.bot.id);
  return NextResponse.json(analytics);
}

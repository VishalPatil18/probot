import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { assembleAndSaveBotContext } from "@/lib/ingestion/assemble";

export async function POST(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const result = await assembleAndSaveBotContext(owner.bot.id);
  return NextResponse.json({
    totalTokens: result.totalTokens,
    truncated: result.truncated,
  });
}

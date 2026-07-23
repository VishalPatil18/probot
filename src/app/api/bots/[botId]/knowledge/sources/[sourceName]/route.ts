import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import {
  assembleAndSaveBotContext,
  deleteSource,
} from "@/lib/ingestion/assemble";

export async function DELETE(
  _request: Request,
  { params }: { params: { botId: string; sourceName: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const sourceName = decodeURIComponent(params.sourceName);
  const removed = await deleteSource(owner.bot.id, sourceName);
  if (removed === 0) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const result = await assembleAndSaveBotContext(owner.bot.id);
  return NextResponse.json({
    removed,
    totalTokens: result.totalTokens,
    truncated: result.truncated,
  });
}

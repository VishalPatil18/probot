import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { getConversationWithMessages } from "@/lib/conversations/queries";

export async function GET(
  _request: Request,
  { params }: { params: { botId: string; convId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const convo = await getConversationWithMessages({
    botId: owner.bot.id,
    conversationId: params.convId,
  });
  if (!convo) {
    return NextResponse.json(
      { error: "conversation_not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json(convo);
}

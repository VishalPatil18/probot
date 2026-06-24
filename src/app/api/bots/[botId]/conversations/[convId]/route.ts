import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { getConversationWithMessages } from "@/lib/conversations/queries";

// GET /api/bots/[botId]/conversations/[convId]
//
// Full transcript viewer. Returns the conversation row with
// its messages embedded in chronological order. Delegates to
// `getConversationWithMessages` (shared with the slice-6.3 RSC page).
//
// Ownership: requireBotOwner gives us the bot row, then the shared query
// filters by `AND bot_id = bot.id` so a forged convId targeting another
// owner's conversation cannot leak across the tenancy boundary.

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

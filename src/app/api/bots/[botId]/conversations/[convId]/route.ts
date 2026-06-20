import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { conversations, db, messages } from "@/lib/db";

// GET /api/bots/[botId]/conversations/[convId]
//
// Stage 6 §6.4: full transcript viewer. Returns the conversation row with
// its messages embedded in chronological order. The composite slice-6.1
// index `messages_conv_created_idx` covers the ORDER BY.
//
// Ownership: requireBotOwner gives us the bot row, then we look up the
// conversation with `AND bot_id = bot.id` so a forged convId targeting
// another owner's conversation cannot leak across the tenancy boundary.

export async function GET(
  _request: Request,
  { params }: { params: { botId: string; convId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const convo = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, params.convId),
      eq(conversations.botId, bot.id),
    ),
  });
  if (!convo) {
    return NextResponse.json(
      { error: "conversation_not_found" },
      { status: 404 },
    );
  }

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({
    id: convo.id,
    sessionId: convo.sessionId,
    recruiterEmail: convo.recruiterEmail,
    messageCount: convo.messageCount,
    startedAt: convo.startedAt,
    lastMessageAt: convo.lastMessageAt,
    messages: rows,
  });
}

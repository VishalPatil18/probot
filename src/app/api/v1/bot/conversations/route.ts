import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireBotToken } from "@/lib/bot-tokens/service";
import { conversations, db, messages } from "@/lib/db";

// POST /api/v1/bot/conversations
//
// The self-hosted runtime posts a chat turn's transcript back so the owner's
// dashboard analytics (conversations + messages) work the same as for managed
// bots. UPSERT on (bot_id, session_id) coalesces concurrent tabs into one
// conversation - identical to the managed chat route's persistence block.
// Returns the conversationId so the runtime can attach a later lead to it.

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await requireBotToken(request.headers);
  if (!auth.ok) return auth.response;
  const { bot } = auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { sessionId, messages: turns } = parsed.data;

  try {
    const conversationId = await db.transaction(async (tx) => {
      const [convo] = await tx
        .insert(conversations)
        .values({ botId: bot.id, sessionId })
        .onConflictDoUpdate({
          target: [conversations.botId, conversations.sessionId],
          set: {
            messageCount: sql`${conversations.messageCount} + ${turns.length}`,
            lastMessageAt: new Date(),
          },
        })
        .returning({ id: conversations.id });
      if (!convo) throw new Error("conversation_upsert_failed");

      await tx.insert(messages).values(
        turns.map((t) => ({
          conversationId: convo.id,
          role: t.role,
          content: t.content,
        })),
      );
      return convo.id;
    });

    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (err) {
    console.warn("[v1/bot/conversations] persistence failed", err);
    return NextResponse.json({ error: "persistence_failed" }, { status: 500 });
  }
}

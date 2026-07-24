import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { botPatchInput } from "@/lib/bots/schemas";
import { bots, db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = botPatchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    themeColor,
    name,
    headline,
    personality,
    suggestedQuestions,
    isActive,
    customInstructions,
    rateLimitPerMinute,
    rateLimitPerDay,
    rateLimitMaxChars,
  } = parsed.data;
  const set: Record<string, unknown> = {};
  if (themeColor !== undefined) set.themeColor = themeColor;
  if (name !== undefined) set.name = name;
  if (headline !== undefined) set.headline = headline;
  if (personality !== undefined) set.personality = personality;
  if (suggestedQuestions !== undefined) {
    set.suggestedQuestions = suggestedQuestions;
  }
  if (isActive !== undefined) set.isActive = isActive;
  if (customInstructions !== undefined) {
    set.customInstructions =
      customInstructions.trim().length > 0 ? customInstructions : null;
  }
  if (rateLimitPerMinute !== undefined) {
    set.rateLimitPerMinute = rateLimitPerMinute;
  }
  if (rateLimitPerDay !== undefined) {
    set.rateLimitPerDay = rateLimitPerDay;
  }
  if (rateLimitMaxChars !== undefined) {
    set.rateLimitMaxChars = rateLimitMaxChars;
  }

  const [updated] = await db
    .update(bots)
    .set(set)
    .where(eq(bots.id, bot.id))
    .returning({
      id: bots.id,
      name: bots.name,
      headline: bots.headline,
      personality: bots.personality,
      suggestedQuestions: bots.suggestedQuestions,
      themeColor: bots.themeColor,
      isActive: bots.isActive,
      customInstructions: bots.customInstructions,
      rateLimitPerMinute: bots.rateLimitPerMinute,
      rateLimitPerDay: bots.rateLimitPerDay,
      rateLimitMaxChars: bots.rateLimitMaxChars,
    });

  return NextResponse.json({ bot: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  await db.delete(bots).where(eq(bots.id, bot.id));
  return NextResponse.json({ ok: true });
}

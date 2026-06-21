import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { botPatchInput } from "@/lib/bots/schemas";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { bots, db } from "@/lib/db";

// PATCH /api/bots/[botId]
//
// Stage 5: partial-update endpoint behind the bot detail page. Currently
// only handles `themeColor` - additional editable fields (headline, etc.)
// can be added to `botPatchInput` without touching this handler since the
// SET object is built from the parsed Zod object.
//
// Mass-assignment safety: the Zod schema explicitly whitelists fields, so a
// request with `{userId: "...", contextText: "INJECTED", createdAt: "..."}`
// is silently dropped - the route never trusts the raw body shape.
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

  // Build the SET payload from defined fields only. Spread-conditional so
  // omitted fields retain their existing DB value. The Zod schema is the
  // mass-assignment whitelist - fields like `userId`, `contextText`,
  // `createdAt`, and `updatedAt` are not in `botPatchInput` so they can
  // never appear here even if a hostile client puts them in the body.
  // (Slice B widened the whitelist to include `isActive` for the status
  // toggle, so it IS legitimately accepted now - see the schema.)
  //
  // Stage 7 widens the whitelist to include `customInstructions` and the
  // three per-bot rate-limit overrides. Each rate-limit field accepts
  // `null` to mean "clear the override and use env defaults"; the Zod
  // schema is `nullable().optional()` so undefined leaves it untouched.
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
    // Empty string from the form means "clear the addendum"; coerce to NULL
    // so the schema column is unambiguously empty rather than storing "".
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

  // The Zod schema's `.refine()` already guarantees at least one field is
  // present, so the SET object is never empty by the time we get here.
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

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { bots, db } from "@/lib/db";

// PATCH /api/bots/[botId]/deployment  (owner-gated)
//
// Flips a bot between managed (served by this platform) and self-hosted (the
// owner runs the `probot-bot` runtime and talks to /api/v1/bot/*). Switching to
// self-hosted does NOT mint a token - that's a separate, explicit step.
const schema = z.object({
  deploymentMode: z.enum(["managed", "self_hosted"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await db
    .update(bots)
    .set({ deploymentMode: parsed.data.deploymentMode })
    .where(eq(bots.id, owner.bot.id));

  return NextResponse.json({ deploymentMode: parsed.data.deploymentMode });
}

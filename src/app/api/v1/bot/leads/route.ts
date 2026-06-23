import { NextResponse } from "next/server";

import { requireBotToken } from "@/lib/bot-tokens/service";
import { captureLead } from "@/lib/leads/capture";
import { leadCaptureInput } from "@/lib/leads/schemas";

// POST /api/v1/bot/leads
//
// The self-hosted runtime forwards a captured recruiter email. Reuses the
// shared `captureLead` core (lead + conversation recruiter-email + dashboard
// notification, idempotent on (botId, conversationId, email)), so leads from a
// self-hosted bot show up in the owner's dashboard exactly like managed ones.
export async function POST(request: Request): Promise<Response> {
  const auth = await requireBotToken(request.headers);
  if (!auth.ok) return auth.response;
  const { bot } = auth;
  if (!bot.userId) {
    // An orphaned bot (owner deleted) can't route a notification; reject.
    return NextResponse.json({ error: "bot_unavailable" }, { status: 409 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = leadCaptureInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, conversationId, contextSummary } = parsed.data;

  try {
    const { lead, deduped } = await captureLead({
      botId: bot.id,
      ownerUserId: bot.userId,
      botName: bot.name,
      email,
      conversationId,
      contextSummary,
    });
    return NextResponse.json({ lead, deduped }, { status: deduped ? 200 : 201 });
  } catch (err) {
    console.warn("[v1/bot/leads] capture failed", err);
    return NextResponse.json({ error: "capture_failed" }, { status: 500 });
  }
}

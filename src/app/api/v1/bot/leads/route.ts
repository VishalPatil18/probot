import { NextResponse } from "next/server";

import { requireBotToken } from "@/lib/bot-tokens/service";
import { captureLead } from "@/lib/leads/capture";
import { leadCaptureInput } from "@/lib/leads/schemas";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireBotToken(request.headers);
  if (!auth.ok) return auth.response;
  const { bot } = auth;
  if (!bot.userId) {
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
  const { name, email, company, linkedinUrl, conversationId, contextSummary } =
    parsed.data;

  try {
    const { lead, deduped } = await captureLead({
      botId: bot.id,
      ownerUserId: bot.userId,
      botName: bot.name,
      email,
      name,
      company,
      linkedinUrl,
      conversationId,
      contextSummary,
    });
    return NextResponse.json({ lead, deduped }, { status: deduped ? 200 : 201 });
  } catch (err) {
    console.warn("[v1/bot/leads] capture failed", err);
    return NextResponse.json({ error: "capture_failed" }, { status: 500 });
  }
}

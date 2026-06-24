import { NextResponse } from "next/server";

import { requireBotToken } from "@/lib/bot-tokens/service";

// GET /api/v1/bot/config
//
// Self-hosted runtime API. Returns the public-safe configuration a
// `probot-bot` runtime needs to render its chat UI. Authenticated by the bot
// token (`Authorization: Bearer pbt_…`); the token resolves to exactly one bot,
// so no botId is taken from the request. Nothing secret is returned (no keys,
// no owner data) - just what the public chat surface already exposes.
//
// This contract is pinned under /api/v1; breaking changes must ship as /api/v2.
export async function GET(request: Request): Promise<Response> {
  const auth = await requireBotToken(request.headers);
  if (!auth.ok) return auth.response;
  const { bot } = auth;

  return NextResponse.json({
    id: bot.id,
    name: bot.name,
    headline: bot.headline,
    personality: bot.personality,
    themeColor: bot.themeColor,
    image: bot.image,
    suggestedQuestions: bot.suggestedQuestions ?? [],
    loadingMessages: bot.loadingMessages ?? [],
    isActive: bot.isActive,
    deploymentMode: bot.deploymentMode,
  });
}

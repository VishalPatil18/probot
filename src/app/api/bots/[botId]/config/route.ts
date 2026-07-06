import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { PUBLIC_CORS_HEADERS, corsPreflight } from "@/lib/bots/cors-headers";
import { bots, db, users } from "@/lib/db";
import { toPublicImageUrl } from "@/lib/uploads/image-upload";

// CORS preflight for the embeddable widget. next.config.js sets
// the CORS headers on GET responses; this OPTIONS export answers the
// browser preflight before the GET fires.
export function OPTIONS(): Response {
  return corsPreflight();
}

// GET /api/bots/[botId]/config - PUBLIC (no auth).
//
// Returns the non-sensitive bot config used by the
// public chat page and the embeddable widget. Intentionally
// scoped to fields safe to expose to anonymous visitors:
//   - bot identity (name, headline)
//   - chat UI affordances (suggestedQuestions, loadingMessages)
//   - owner branding (ownerName, ownerImage, ownerUsername)
//
// What is NOT returned (and must never be):
//   - bot.contextText (the assembled knowledge base - owner's career data,
//     potentially private prose. The chat endpoint streams it through the
//     LLM but never echoes it raw.)
//   - owner email / name / llmProvider / llmModel
//   - knowledge_base rows
export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.isActive, true)),
    columns: {
      id: true,
      userId: true,
      name: true,
      headline: true,
      themeColor: true,
      image: true,
      suggestedQuestions: true,
      loadingMessages: true,
    },
  });
  if (!bot) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, bot.userId),
    columns: { username: true, name: true, image: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      bot: {
        id: bot.id,
        name: bot.name,
        headline: bot.headline,
        themeColor: bot.themeColor,
        // Absolutized so cross-origin widget consumers get a working URL.
        // Also self-heals rows written by older builds with a hard-coded
        // http://localhost:3000 prefix — see toPublicImageUrl.
        image: toPublicImageUrl(bot.image),
        suggestedQuestions: bot.suggestedQuestions ?? [],
        loadingMessages: bot.loadingMessages,
      },
      owner: {
        username: owner.username,
        name: owner.name,
        image: toPublicImageUrl(owner.image),
      },
    },
    {
      // Public data - let the CDN absorb repeated fetches so an enumeration
      // attacker hits cache, not the origin. 60s s-maxage matches the rate
      // at which bot edits should reasonably propagate. A proper per-IP
      // rate limit lands with the broader Redis work later.
      // Also include CORS headers for the embeddable widget.
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        ...PUBLIC_CORS_HEADERS,
      },
    },
  );
}

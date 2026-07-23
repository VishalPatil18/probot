import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { PUBLIC_CORS_HEADERS, corsPreflight } from "@/lib/bots/cors-headers";
import { bots, db, users } from "@/lib/db";
import { toPublicImageUrl } from "@/lib/uploads/image-upload";

export function OPTIONS(): Response {
  return corsPreflight();
}

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
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        ...PUBLIC_CORS_HEADERS,
      },
    },
  );
}

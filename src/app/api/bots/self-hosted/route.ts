import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { mintBotToken } from "@/lib/bot-tokens/service";
import { bots, db } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  headline: z.string().trim().max(120).optional(),
  tokenName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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
  const input = parsed.data;

  const [created] = await db
    .insert(bots)
    .values({
      userId,
      name: input.name,
      headline: input.headline ?? null,
      personality: "professional",
      contextText: "",
      suggestedQuestions: [],
      deploymentMode: "self_hosted",
      isActive: true,
    })
    .returning();
  if (!created) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const token = await mintBotToken(created.id, input.tokenName ?? "Default");

  return NextResponse.json(
    {
      bot: { id: created.id, name: created.name, headline: created.headline },
      token: { id: token.id, rawToken: token.rawToken },
    },
    { status: 201 },
  );
}

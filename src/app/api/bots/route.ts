import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { botInput } from "@/lib/bots/schemas";
import { bots, db, users } from "@/lib/db";

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = botInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const result = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        llmProvider: input.llmProvider,
        llmModel: input.llmModel ?? null,
      })
      .where(eq(users.id, userId));

    const existing = await tx.query.bots.findFirst({
      where: eq(bots.userId, userId),
    });

    if (existing) {
      const [updated] = await tx
        .update(bots)
        .set({
          name: input.name,
          headline: input.headline ?? null,
          personality: input.personality,
          contextText: input.contextText,
          suggestedQuestions: input.suggestedQuestions,
          ...(input.contextTokenCap !== undefined
            ? { contextTokenCap: input.contextTokenCap }
            : {}),
        })
        .where(eq(bots.id, existing.id))
        .returning();
      return { bot: updated, created: false };
    }

    const [created] = await tx
      .insert(bots)
      .values({
        userId,
        name: input.name,
        headline: input.headline ?? null,
        personality: input.personality,
        contextText: input.contextText,
        suggestedQuestions: input.suggestedQuestions,
        ...(input.contextTokenCap !== undefined
          ? { contextTokenCap: input.contextTokenCap }
          : {}),
      })
      .returning();
    return { bot: created, created: true };
  });

  return NextResponse.json(
    { bot: result.bot },
    { status: result.created ? 201 : 200 },
  );
}

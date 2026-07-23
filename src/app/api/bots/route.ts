import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { mintPreviewToken } from "@/lib/bots/preview-token";
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
      where: and(eq(bots.userId, userId), eq(bots.deploymentMode, "managed")),
    });

    if (existing) {
      const nextPreviewToken =
        existing.isActive
          ? existing.previewToken
          : (existing.previewToken ?? mintPreviewToken(existing.id, userId));

      const [updated] = await tx
        .update(bots)
        .set({
          name: input.name,
          headline: input.headline ?? null,
          personality: input.personality,
          contextText: input.contextText,
          suggestedQuestions: input.suggestedQuestions,
          previewToken: nextPreviewToken,
          ...(input.contextTokenCap !== undefined
            ? { contextTokenCap: input.contextTokenCap }
            : {}),
          ...(input.themeColor !== undefined
            ? { themeColor: input.themeColor }
            : {}),
          ...(input.customInstructions !== undefined
            ? {
                customInstructions:
                  input.customInstructions.trim().length > 0
                    ? input.customInstructions
                    : null,
              }
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
        isActive: false,
        ...(input.contextTokenCap !== undefined
          ? { contextTokenCap: input.contextTokenCap }
          : {}),
        ...(input.themeColor !== undefined
          ? { themeColor: input.themeColor }
          : {}),
        ...(input.customInstructions !== undefined &&
        input.customInstructions.trim().length > 0
          ? { customInstructions: input.customInstructions }
          : {}),
      })
      .returning();
    if (!created) {
      throw new Error("Bot insert returned no row");
    }

    const previewToken = mintPreviewToken(created.id, userId);
    const [withToken] = await tx
      .update(bots)
      .set({ previewToken })
      .where(eq(bots.id, created.id))
      .returning();

    return { bot: withToken ?? created, created: true };
  });

  return NextResponse.json(
    { bot: result.bot },
    { status: result.created ? 201 : 200 },
  );
}

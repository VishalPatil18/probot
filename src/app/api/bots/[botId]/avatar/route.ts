import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { botAvatars, bots, db } from "@/lib/db";
import { parseImageUpload, toPublicImageUrl } from "@/lib/uploads/image-upload";

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const parsed = await parseImageUpload(form);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { buffer, contentType } = parsed;
  const botId = owner.bot.id;

  const storedImage = `/api/bot-avatar/${botId}?v=${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(botAvatars)
      .values({ botId, data: buffer, contentType })
      .onConflictDoUpdate({
        target: botAvatars.botId,
        set: { data: buffer, contentType, updatedAt: new Date() },
      });
    await tx.update(bots).set({ image: storedImage }).where(eq(bots.id, botId));
  });

  return NextResponse.json({ image: toPublicImageUrl(storedImage) });
}

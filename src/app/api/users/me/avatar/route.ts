import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, userAvatars, users } from "@/lib/db";
import { parseImageUpload, toPublicImageUrl } from "@/lib/uploads/image-upload";

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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

  const storedImage = `/api/avatar/${userId}?v=${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(userAvatars)
      .values({ userId, data: buffer, contentType })
      .onConflictDoUpdate({
        target: userAvatars.userId,
        set: { data: buffer, contentType, updatedAt: new Date() },
      });
    await tx.update(users).set({ image: storedImage }).where(eq(users.id, userId));
  });

  return NextResponse.json({ image: toPublicImageUrl(storedImage) });
}

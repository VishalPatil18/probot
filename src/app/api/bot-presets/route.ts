import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { listBotPresets, saveBotPreset } from "@/lib/bot-presets/service";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(80),
  settings: z.record(z.string(), z.unknown()),
});

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const presets = await listBotPresets(session.user.id);
  return NextResponse.json({ presets });
}

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await saveBotPreset(
    session.user.id,
    parsed.data.name,
    parsed.data.settings,
  );
  return NextResponse.json(
    { id: result.id, name: parsed.data.name },
    { status: 201 },
  );
}

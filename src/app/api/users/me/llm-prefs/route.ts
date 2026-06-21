import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PROVIDER_NAMES, type ProviderName } from "@/lib/ai/providers";
import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";

// PATCH /api/users/me/llm-prefs
//
// Stage 7 Phase 3 - backs the dashboard's provider/model switcher. Only
// non-sensitive preference columns (llmProvider, llmModel) are touched.
// The actual API key never goes through this endpoint; it lives either in
// the user's browser (self-host) or in encrypted_llm_keys per bot (managed).
//
// Mass-assignment safety: Zod schema explicitly whitelists only the two
// pref columns, so a hostile client cannot mass-assign email_verified,
// hashed_password, etc.

const llmPrefsInput = z
  .object({
    llmProvider: z
      .enum(PROVIDER_NAMES as readonly [string, ...string[]])
      .optional(),
    llmModel: z
      .string()
      .trim()
      .max(60, "Model identifier must be ≤ 60 chars")
      .nullable()
      .optional(),
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "PATCH body must include at least one field",
  );

export async function PATCH(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = llmPrefsInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { llmProvider, llmModel } = parsed.data;
  const set: Record<string, unknown> = {};
  if (llmProvider !== undefined) set.llmProvider = llmProvider as ProviderName;
  if (llmModel !== undefined) {
    set.llmModel = llmModel === null || llmModel.length === 0 ? null : llmModel;
  }

  const [updated] = await db
    .update(users)
    .set(set)
    .where(eq(users.id, userId))
    .returning({
      llmProvider: users.llmProvider,
      llmModel: users.llmModel,
    });

  return NextResponse.json({ user: updated });
}

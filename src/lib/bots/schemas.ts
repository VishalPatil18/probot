import { z } from "zod";

import { PROVIDER_NAMES } from "@/lib/ai/providers";
import { themeColorSchema } from "./theme-color";

export const PERSONALITY_PRESETS = [
  "professional",
  "creative",
  "enthusiastic",
] as const;

export type Personality = (typeof PERSONALITY_PRESETS)[number];

const nonEmptyTrimmed = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, "Must not be empty");

// contextText is optional/empty in Stage 2: the bot's knowledge can now come
// from `knowledge_base` chunks (PDFs + text), reassembled into context_text
// server-side. Stage 1 text-only path still works (textarea content goes here).
export const CONTEXT_TOKEN_CAP_MIN = 1_000;
export const CONTEXT_TOKEN_CAP_MAX = 100_000;
export const CONTEXT_TOKEN_CAP_DEFAULT = 12_000;

export const botInput = z.object({
  name: nonEmptyTrimmed.pipe(z.string().max(100, "Name must be ≤ 100 chars")),
  headline: z.string().max(120, "Headline must be ≤ 120 chars").optional(),
  personality: z.enum(PERSONALITY_PRESETS),
  contextText: z
    .string()
    .max(50_000, "Context must be ≤ 50,000 chars")
    .transform((v) => v.trim()),
  contextTokenCap: z
    .number()
    .int()
    .min(CONTEXT_TOKEN_CAP_MIN, "Token cap must be ≥ 1,000")
    .max(CONTEXT_TOKEN_CAP_MAX, "Token cap must be ≤ 100,000")
    .optional(),
  suggestedQuestions: z
    .array(z.string().max(200, "Each question must be ≤ 200 chars"))
    .max(6, "At most 6 suggested questions"),
  llmProvider: z.enum(PROVIDER_NAMES as readonly [string, ...string[]]),
  llmModel: z
    .string()
    .max(60, "Model identifier must be ≤ 60 chars")
    .optional(),
  // Stage 5: per-bot widget/badge color. Optional on create so existing
  // forms don't break; the DB default '#7c5cff' takes over when absent.
  themeColor: themeColorSchema.optional(),
});

export type BotInput = z.infer<typeof botInput>;

// Stage 5: partial-update schema for the PATCH endpoint behind the bot
// detail page. Limited to fields the detail page actually edits so we
// don't accidentally widen the surface (and let an attacker mass-assign
// e.g. `userId` or `isActive`).
export const botPatchInput = z
  .object({
    themeColor: themeColorSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "PATCH body must include at least one field",
  );

export type BotPatchInput = z.infer<typeof botPatchInput>;

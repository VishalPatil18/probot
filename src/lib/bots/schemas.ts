import { z } from "zod";

import { PROVIDER_NAMES } from "@/lib/ai/providers";

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

export const botInput = z.object({
  name: nonEmptyTrimmed.pipe(z.string().max(100, "Name must be ≤ 100 chars")),
  headline: z.string().max(120, "Headline must be ≤ 120 chars").optional(),
  personality: z.enum(PERSONALITY_PRESETS),
  contextText: nonEmptyTrimmed.pipe(
    z.string().max(50_000, "Context must be ≤ 50,000 chars"),
  ),
  suggestedQuestions: z
    .array(z.string().max(200, "Each question must be ≤ 200 chars"))
    .max(6, "At most 6 suggested questions"),
  llmProvider: z.enum(PROVIDER_NAMES as readonly [string, ...string[]]),
  llmModel: z
    .string()
    .max(60, "Model identifier must be ≤ 60 chars")
    .optional(),
});

export type BotInput = z.infer<typeof botInput>;

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

export const CONTEXT_TOKEN_CAP_MIN = 1_000;
export const CONTEXT_TOKEN_CAP_MAX = 100_000;
export const CONTEXT_TOKEN_CAP_DEFAULT = 12_000;

export const CUSTOM_INSTRUCTIONS_MAX = 2000;

export const RATE_LIMIT_PER_MINUTE_MAX = 100;
export const RATE_LIMIT_PER_DAY_MAX = 5_000;
export const RATE_LIMIT_MAX_CHARS_MAX = 32_000;

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
  themeColor: themeColorSchema.optional(),
  customInstructions: z
    .string()
    .max(
      CUSTOM_INSTRUCTIONS_MAX,
      `Custom instructions must be ≤ ${CUSTOM_INSTRUCTIONS_MAX} chars`,
    )
    .optional(),
  deploymentMode: z.enum(["managed", "self_hosted"]).optional(),
});

export type BotInput = z.infer<typeof botInput>;

export const botPatchInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name must not be empty")
      .max(100, "Name must be ≤ 100 chars")
      .optional(),
    headline: z
      .string()
      .max(120, "Headline must be ≤ 120 chars")
      .transform((v) => v.trim())
      .optional(),
    personality: z.enum(PERSONALITY_PRESETS).optional(),
    suggestedQuestions: z
      .array(z.string().max(200, "Each question must be ≤ 200 chars"))
      .max(6, "At most 6 suggested questions")
      .optional(),
    isActive: z.boolean().optional(),
    themeColor: themeColorSchema.optional(),
    customInstructions: z
      .string()
      .max(
        CUSTOM_INSTRUCTIONS_MAX,
        `Custom instructions must be ≤ ${CUSTOM_INSTRUCTIONS_MAX} chars`,
      )
      .optional(),
    rateLimitPerMinute: z
      .number()
      .int()
      .min(1)
      .max(RATE_LIMIT_PER_MINUTE_MAX)
      .nullable()
      .optional(),
    rateLimitPerDay: z
      .number()
      .int()
      .min(1)
      .max(RATE_LIMIT_PER_DAY_MAX)
      .nullable()
      .optional(),
    rateLimitMaxChars: z
      .number()
      .int()
      .min(100)
      .max(RATE_LIMIT_MAX_CHARS_MAX)
      .nullable()
      .optional(),
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "PATCH body must include at least one field",
  );

export type BotPatchInput = z.infer<typeof botPatchInput>;

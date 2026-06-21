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

// Stage 7 §FR-002.7: custom instructions cap. Aligned with the architecture
// blueprint; tighter caps can land later without a migration since the column
// is `text` (no DB-level length constraint).
export const CUSTOM_INSTRUCTIONS_MAX = 2000;

// Stage 7 §FR-010.9: per-bot rate-limit ceilings. Hard caps prevent a creator
// from setting absurd values that would effectively disable abuse protection.
// The rate-limit module enforces these too (defence in depth).
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
  // Stage 5: per-bot widget/badge color. Optional on create so existing
  // forms don't break; the DB default '#7c5cff' takes over when absent.
  themeColor: themeColorSchema.optional(),
  // Stage 7 §FR-002.7: optional free-form additions to the system prompt.
  customInstructions: z
    .string()
    .max(
      CUSTOM_INSTRUCTIONS_MAX,
      `Custom instructions must be ≤ ${CUSTOM_INSTRUCTIONS_MAX} chars`,
    )
    .optional(),
});

export type BotInput = z.infer<typeof botInput>;

// Stage 5: partial-update schema for the PATCH endpoint behind the bot
// detail page. Limited to fields the detail page + settings page actually
// edit so we don't accidentally widen the surface (and let an attacker
// mass-assign e.g. `userId`, `isActive`, or `contextText`).
//
// Stage 6 slice 6.5 widened from `themeColor` only to also include the
// bot identity fields the settings page edits. Each field is independently
// optional so callers can PATCH any subset; the `.refine()` rejects the
// fully-empty body so an SQL `UPDATE … SET WHERE …` with no SET clause
// can never reach the database.
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
      // Trim at parse time so a hostile / sloppy client can't store
      // whitespace-only padding that renders as a blank-looking headline
      // in the chat UI. After trim, the empty string is still valid -
      // it's the way the UI signals "clear the headline".
      .transform((v) => v.trim())
      .optional(),
    personality: z.enum(PERSONALITY_PRESETS).optional(),
    suggestedQuestions: z
      .array(z.string().max(200, "Each question must be ≤ 200 chars"))
      .max(6, "At most 6 suggested questions")
      .optional(),
    // Slice B: Bot configuration tab includes a live/off status toggle.
    // Inactive bots reject chat requests (Stage 1 chat route already
    // gates on `bots.is_active`) and don't accept lead capture (slice
    // 6.2 endpoint also gates on it). Adding here so the settings page
    // can flip the bit.
    isActive: z.boolean().optional(),
    themeColor: themeColorSchema.optional(),
    // Stage 7 §FR-002.7: dashboard editor for the prompt addendum. The
    // empty string is a legitimate "clear it" signal; we transform to
    // `null` at the route layer so the DB column flips back to NULL
    // rather than storing an empty string.
    customInstructions: z
      .string()
      .max(
        CUSTOM_INSTRUCTIONS_MAX,
        `Custom instructions must be ≤ ${CUSTOM_INSTRUCTIONS_MAX} chars`,
      )
      .optional(),
    // Stage 7 §FR-010.9: per-bot rate-limit overrides. `null` clears the
    // column (revert to env default); a positive integer takes precedence.
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

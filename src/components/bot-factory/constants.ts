import type { ProviderName } from "@/lib/ai/providers";
import type { Personality } from "@/lib/bots/schemas";

export const TOTAL_STEPS = 5;
export const DEFAULT_AZURE_API_VERSION = "2025-01-01-preview";

// Providers the bot creator is allowed to pick. All four ship real adapters
// today; this set is the single place to gate one off (for example, to mark
// a provider "experimental") without touching the provider-picker JSX.
export const ENABLED_PROVIDERS: ReadonlySet<ProviderName> = new Set([
  "anthropic",
  "openai",
  "azure",
  "google",
]);

export const PERSONALITY_LABELS: Record<
  Personality,
  { title: string; tagline: string }
> = {
  professional: { title: "Professional", tagline: "Clear & concise" },
  creative: { title: "Creative", tagline: "Warm & expressive" },
  enthusiastic: { title: "Enthusiastic", tagline: "High energy" },
};

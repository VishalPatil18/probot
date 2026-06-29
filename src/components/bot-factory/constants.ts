import type { ProviderName } from "@/lib/ai/providers";
import type { Personality } from "@/lib/bots/schemas";

export const TOTAL_STEPS = 5;
export const DEFAULT_AZURE_API_VERSION = "2025-01-01-preview";

// All four providers ship real adapters now. The Set is
// kept (rather than dropped) so a future "experimental" / "beta" gate has
// a single place to live without rewiring the JSX.
export const STAGE1_ENABLED: ReadonlySet<ProviderName> = new Set([
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

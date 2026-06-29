import type { ProviderName } from "@/lib/ai/providers";

// Selectable model names per provider, shared by the Bot Factory wizard and the
// dashboard AI-model settings tab so the two surfaces can never drift.
//
// For Azure the user supplies their deployment name as free text (it IS the
// model), so the dropdown is empty/hidden on that branch.
export const MODEL_OPTIONS: Record<ProviderName, string[]> = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-5"],
  openai: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  azure: [],
};

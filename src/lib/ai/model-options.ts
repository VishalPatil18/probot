import type { ProviderName } from "@/lib/ai/providers";

export const MODEL_OPTIONS: Record<ProviderName, string[]> = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-5"],
  openai: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  azure: [],
  grok: [],
};

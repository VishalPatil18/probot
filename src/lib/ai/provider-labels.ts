import type { ProviderName } from "@/lib/ai/providers";

export const PROVIDER_LABELS: Record<
  ProviderName,
  { name: string; family: string }
> = {
  anthropic: { name: "Anthropic", family: "Claude" },
  google: { name: "Google", family: "Gemini" },
  azure: { name: "Azure", family: "OpenAI" },
  openai: { name: "OpenAI", family: "GPT" },
  grok: { name: "Grok", family: "xAI" },
};

export function describeProvider(
  provider: string | null | undefined,
  model: string | null | undefined,
): { name: string; model: string } {
  const fallback = { name: "Anthropic", family: "Claude" };
  const meta =
    provider && provider in PROVIDER_LABELS
      ? PROVIDER_LABELS[provider as ProviderName]
      : fallback;
  return {
    name: meta.name,
    model: model && model.trim().length > 0 ? model : meta.family,
  };
}

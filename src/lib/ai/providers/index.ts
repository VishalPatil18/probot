import { anthropicProvider } from "./anthropic";
import { azureProvider } from "./azure";
import { googleProvider } from "./google";
import { grokProvider } from "./grok";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import type { LLMProvider, ProviderName } from "./types";

const PROVIDERS: Record<ProviderName, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  azure: azureProvider,
  grok: grokProvider,
  ollama: ollamaProvider,
};

export const PROVIDER_NAMES: readonly ProviderName[] = [
  "anthropic",
  "openai",
  "google",
  "azure",
  "grok",
  "ollama",
];

export function getProvider(name: ProviderName): LLMProvider {
  return PROVIDERS[name];
}

export function isProviderName(value: string): value is ProviderName {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export type {
  CompleteParams,
  CompleteResult,
  LLMProvider,
  ProviderErrorCategory,
  ProviderName,
} from "./types";
export { ProviderError } from "./types";

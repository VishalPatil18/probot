import { anthropicProvider } from "./anthropic";
import { deepseekProvider } from "./deepseek";
import { googleProvider } from "./google";
import { openaiProvider } from "./openai";
import type { LLMProvider, ProviderName } from "./types";

const PROVIDERS: Record<ProviderName, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  deepseek: deepseekProvider,
};

export const PROVIDER_NAMES: readonly ProviderName[] = [
  "anthropic",
  "openai",
  "google",
  "deepseek",
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

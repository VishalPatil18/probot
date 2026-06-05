import type { CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

export const deepseekProvider: LLMProvider = {
  defaultModel: "deepseek-chat",
  async complete(): Promise<CompleteResult> {
    throw new ProviderError(
      "deepseek",
      "unknown",
      "DeepSeek provider is not implemented in Stage 1",
    );
  },
};

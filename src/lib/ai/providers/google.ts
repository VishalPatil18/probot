import type { CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

export const googleProvider: LLMProvider = {
  defaultModel: "gemini-1.5-flash",
  async complete(): Promise<CompleteResult> {
    throw new ProviderError(
      "google",
      "unknown",
      "Google Gemini provider is not implemented in Stage 1",
    );
  },
};

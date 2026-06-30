import type { ProviderName } from "@/lib/ai/providers";
import type { Personality } from "@/lib/bots/schemas";

export type InitialBot = {
  id: string;
  name: string;
  headline: string | null;
  personality: Personality;
  contextText: string;
  contextTokenCap?: number;
  suggestedQuestions: string[] | null;
  customInstructions?: string | null;
  themeColor?: string;
};

export type Props = {
  username: string;
  initialBot?: InitialBot;
  initialLlmProvider?: ProviderName;
  initialLlmModel?: string;
};

export type FormState = {
  name: string;
  headline: string;
  personality: Personality;
  botImageFile: File | null;
  themeColor: string;
  contextText: string;
  pdfFiles: File[];
  contextTokenCap: number;
  suggestedQuestions: string[];
  customInstructions: string;
  llmProvider: ProviderName;
  llmModel: string;
  apiKey: string;
  azureEndpoint: string;
  azureApiVersion: string;
  // Ollama-only: base URL of the local model server (ignored for other providers).
  ollamaBaseUrl: string;
  embeddingApiKey: string;
};

export type PatchFn = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

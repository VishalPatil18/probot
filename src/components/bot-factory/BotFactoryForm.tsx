"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MODEL_OPTIONS } from "@/lib/ai/model-options";
import { type ProviderName } from "@/lib/ai/providers";
import { CONTEXT_TOKEN_CAP_DEFAULT } from "@/lib/bots/schemas";
import {
  getEmbeddingApiKey,
  setEmbeddingApiKey,
} from "@/lib/client/embedding-key-store";
import {
  getApiKey,
  getAzureCreds,
  setApiKey,
  setAzureCreds,
} from "@/lib/client/llm-key-store";

import {
  DEFAULT_AZURE_API_VERSION,
  ENABLED_PROVIDERS,
  TOTAL_STEPS,
} from "./constants";
import {
  collectFailures,
  type IngestFailure,
  type IngestFileResult,
} from "./ingest-helpers";
import { IngestFailuresPanel } from "./parts/IngestFailuresPanel";
import { LivePreview } from "./parts/LivePreview";
import { StepperHeader } from "./parts/StepperHeader";
import { StepAIModel } from "./steps/StepAIModel";
import { StepDeploy } from "./steps/StepDeploy";
import { StepIdentity } from "./steps/StepIdentity";
import { StepKnowledge } from "./steps/StepKnowledge";
import { StepPersonality } from "./steps/StepPersonality";
import type { FormState, Props } from "./types";

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 10) return "•".repeat(Math.max(8, trimmed.length));
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

export function BotFactoryForm({
  username,
  initialBot,
  initialLlmProvider,
  initialLlmModel,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const initialProvider: ProviderName = initialLlmProvider ?? "anthropic";
  const providerModels = MODEL_OPTIONS[initialProvider];
  const initialModel =
    providerModels.length === 0
      ? (initialLlmModel ?? "")
      : initialLlmModel && providerModels.includes(initialLlmModel)
        ? initialLlmModel
        : (providerModels[0] ?? "");
  const [form, setForm] = useState<FormState>({
    name: initialBot?.name ?? "",
    headline: initialBot?.headline ?? "",
    personality: initialBot?.personality ?? "professional",
    botImageFile: null,
    themeColor: initialBot?.themeColor ?? "#0070dd",
    contextText: initialBot?.contextText ?? "",
    pdfFiles: [],
    contextTokenCap: initialBot?.contextTokenCap ?? CONTEXT_TOKEN_CAP_DEFAULT,
    suggestedQuestions: initialBot?.suggestedQuestions ?? [],
    customInstructions: initialBot?.customInstructions ?? "",
    llmProvider: initialProvider,
    llmModel: initialModel,
    apiKey: "",
    apiKeyStoredMask: null,
    azureEndpoint: "",
    azureApiVersion: DEFAULT_AZURE_API_VERSION,
    embeddingApiKey: "",
    embeddingApiKeyStoredMask: null,
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [ingestFailures, setIngestFailures] = useState<IngestFailure[]>([]);
  const [retryingName, setRetryingName] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storedKey, azure, storedEmbedKey] = await Promise.all([
          getApiKey(),
          getAzureCreds(),
          getEmbeddingApiKey(),
        ]);
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          apiKeyStoredMask: storedKey ? maskSecret(storedKey) : null,
          embeddingApiKeyStoredMask: storedEmbedKey
            ? maskSecret(storedEmbedKey)
            : null,
          azureEndpoint: azure?.endpoint ?? prev.azureEndpoint,
          azureApiVersion: azure?.apiVersion ?? prev.azureApiVersion,
        }));
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectProvider(provider: ProviderName) {
    if (!ENABLED_PROVIDERS.has(provider)) return;
    setForm((prev) => ({
      ...prev,
      llmProvider: provider,
      llmModel: provider === "azure" ? "" : (MODEL_OPTIONS[provider][0] ?? ""),
    }));
  }

  function addQuestion() {
    const q = newQuestion.trim();
    if (q.length === 0 || form.suggestedQuestions.length >= 6) return;
    patch("suggestedQuestions", [...form.suggestedQuestions, q]);
    setNewQuestion("");
  }

  function removeQuestion(index: number) {
    patch(
      "suggestedQuestions",
      form.suggestedQuestions.filter((_, i) => i !== index),
    );
  }

  function stepIsValid(n: number): boolean {
    if (n === 1) return form.name.trim().length > 0;
    if (n === 2) {
      return form.contextText.trim().length > 0 || form.pdfFiles.length > 0;
    }
    if (n === 3) return true;
    if (n === 4) {
      if (form.apiKey.trim().length === 0) {
        if (!form.apiKeyStoredMask) return false;
      } else if (form.apiKey.trim().length < 8) {
        return false;
      }
      if (form.llmProvider === "azure") {
        const endpoint = form.azureEndpoint.trim();
        const deployment = form.llmModel.trim();
        return endpoint.startsWith("https://") && deployment.length > 0;
      }
      if (form.llmProvider === "grok") {
        return form.llmModel.trim().length > 0;
      }
      return true;
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (form.apiKey.trim().length > 0) {
        await setApiKey(form.apiKey);
      }
      if (form.llmProvider === "azure") {
        await setAzureCreds({
          endpoint: form.azureEndpoint,
          apiVersion: form.azureApiVersion || DEFAULT_AZURE_API_VERSION,
        });
      }
      if (form.embeddingApiKey.trim().length > 0) {
        await setEmbeddingApiKey(form.embeddingApiKey);
      }

      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          headline: form.headline.trim(),
          personality: form.personality,
          contextText: form.contextText.trim(),
          contextTokenCap: form.contextTokenCap,
          suggestedQuestions: form.suggestedQuestions,
          themeColor: form.themeColor,
          llmProvider: form.llmProvider,
          llmModel: form.llmModel,
          ...(form.customInstructions.trim().length > 0
            ? { customInstructions: form.customInstructions.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Could not save your bot. Try again.");
        return;
      }
      const body = (await res.json()) as {
        bot: {
          id: string;
          isActive?: boolean;
          previewToken?: string | null;
        };
      };
      setPreviewToken(body.bot.previewToken ?? null);
      setPublished(body.bot.isActive ?? false);

      const typedKey = form.apiKey.trim();
      const uploadKey =
        typedKey.length >= 8
          ? typedKey
          : form.apiKeyStoredMask
            ? ((await getApiKey()) ?? "").trim()
            : "";
      if (uploadKey.length >= 8) {
        const azureFields =
          form.llmProvider === "azure" && form.azureEndpoint.trim().length > 0
            ? {
                azureEndpoint: form.azureEndpoint.trim(),
                ...(form.azureApiVersion.trim().length > 0
                  ? { azureApiVersion: form.azureApiVersion.trim() }
                  : {}),
              }
            : {};
        const keyRes = await fetch(`/api/bots/${body.bot.id}/llm-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: uploadKey, ...azureFields }),
        }).catch(() => null);
        if (!keyRes) {
          setError(
            "Your bot was saved as a draft, but we couldn't reach the server to store your API key. Open Settings → AI Model & Key to try again before publishing.",
          );
        } else if (!keyRes.ok) {
          const keyBody = (await keyRes.json().catch(() => ({}))) as {
            error?: string;
          };
          if (keyBody.error !== "managed_storage_unavailable") {
            setError(
              "Your bot was saved as a draft, but we couldn't store your API key on our server. Open Settings → AI Model & Key to try again before publishing.",
            );
          }
        }
      }

      if (form.botImageFile) {
        const avatarForm = new FormData();
        avatarForm.append("file", form.botImageFile, form.botImageFile.name);
        await fetch(`/api/bots/${body.bot.id}/avatar`, {
          method: "POST",
          body: avatarForm,
        }).catch(() => undefined);
      }

      if (form.pdfFiles.length > 0) {
        const fd = new FormData();
        if (form.contextText.trim().length > 0) {
          fd.set("text", form.contextText.trim());
        }
        for (const file of form.pdfFiles) {
          fd.append("files", file, file.name);
        }
        const embeddingKey = form.embeddingApiKey.trim();
        const knowledgeHeaders: Record<string, string> = {};
        if (embeddingKey.length >= 8) {
          knowledgeHeaders["x-embedding-api-key"] = embeddingKey;
        }
        const kRes = await fetch(`/api/bots/${body.bot.id}/knowledge`, {
          method: "POST",
          headers: knowledgeHeaders,
          body: fd,
        });
        const kBody = (await kRes.json().catch(() => ({}))) as {
          files?: IngestFileResult[];
          error?: string;
        };
        if (kRes.ok) {
          setIngestFailures(collectFailures(kBody.files));
        } else {
          setIngestFailures([
            {
              name: "Knowledge",
              error: kBody.error ?? "Some content couldn't be processed.",
            },
          ]);
        }
      }

      setCreatedBotId(body.bot.id);
      setStep(5);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryFile(name: string): Promise<void> {
    if (!createdBotId || retryingName) return;
    const file = form.pdfFiles.find((f) => f.name === name);
    if (!file) return;
    setRetryingName(name);
    try {
      const fd = new FormData();
      fd.append("files", file, file.name);
      const embeddingKey = form.embeddingApiKey.trim();
      const headers: Record<string, string> = {};
      if (embeddingKey.length >= 8) {
        headers["x-embedding-api-key"] = embeddingKey;
      }
      const res = await fetch(`/api/bots/${createdBotId}/knowledge`, {
        method: "POST",
        headers,
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        files?: IngestFileResult[];
      };
      const stillFailed = collectFailures(body.files).some(
        (f) => f.name === name,
      );
      if (res.ok && !stillFailed) {
        setIngestFailures((prev) => prev.filter((f) => f.name !== name));
      }
    } finally {
      setRetryingName(null);
    }
  }

  function next() {
    if (step === 4) {
      void submit();
      return;
    }
    if (step === 5) {
      const target =
        !published && previewToken
          ? `/u/${username}/chat?preview=${encodeURIComponent(previewToken)}`
          : `/u/${username}/chat`;
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    if (stepIsValid(step) && step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
    if (step === 1) {
      router.push("/dashboard");
      return;
    }
    if (step > 1) setStep(step - 1);
  }

  async function publish() {
    if (!createdBotId || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${createdBotId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setError(
          body.message ??
            body.error ??
            "Could not publish your bot. Try again.",
        );
        return;
      }
      setPublished(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <StepperHeader step={step} />
      <div className="grid w-full max-w-[1280px] mx-auto lg:grid-cols-[1fr_440px] lg:flex-1 lg:min-h-0">
        <div className="px-6 lg:px-12 py-10 lg:overflow-y-auto">
          <div className="max-w-lg">
            {step === 1 && (
              <StepIdentity form={form} patch={patch} username={username} />
            )}
            {step === 2 && <StepKnowledge form={form} patch={patch} />}
            {step === 3 && (
              <StepPersonality
                form={form}
                patch={patch}
                newQuestion={newQuestion}
                setNewQuestion={setNewQuestion}
                addQuestion={addQuestion}
                removeQuestion={removeQuestion}
              />
            )}
            {step === 4 && (
              <StepAIModel
                form={form}
                patch={patch}
                selectProvider={selectProvider}
              />
            )}
            {step === 5 && (
              <>
                {ingestFailures.length > 0 && (
                  <IngestFailuresPanel
                    failures={ingestFailures}
                    retryingName={retryingName}
                    onRetry={retryFile}
                  />
                )}
                <StepDeploy
                  username={username}
                  createdBotId={createdBotId}
                  previewToken={previewToken}
                  published={published}
                  publishing={publishing}
                  onPublish={publish}
                />
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-base">
              <button
                type="button"
                onClick={back}
                className={`btn btn-secondary ${step === 5 ? "invisible" : ""}`}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={submitting || !stepIsValid(step)}
                className="btn btn-primary !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nextLabel(step, submitting)}
              </button>
            </div>
          </div>
        </div>

        <LivePreview form={form} />
      </div>
    </div>
  );
}

function nextLabel(step: number, submitting: boolean): string {
  if (submitting) return "Saving…";
  if (step === 4) return "Save as draft";
  if (step === 5) return "Open chat";
  return "Continue";
}

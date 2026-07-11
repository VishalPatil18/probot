"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MODEL_OPTIONS } from "@/lib/ai/model-options";
import { type ProviderName } from "@/lib/ai/providers";
import { CONTEXT_TOKEN_CAP_DEFAULT } from "@/lib/bots/schemas";
import { setEmbeddingApiKey } from "@/lib/client/embedding-key-store";
import {
  setApiKey,
  setAzureCreds,
  setOllamaBaseUrl,
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

export function BotFactoryForm({
  username,
  initialBot,
  initialLlmProvider,
  initialLlmModel,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const initialProvider: ProviderName = initialLlmProvider ?? "anthropic";
  // If the DB has a model that isn't in our current MODEL_OPTIONS (e.g. a
  // deprecated id, or one chosen via a future custom field), fall back to the
  // first option so the <select> can't render in a desynced state.
  // Free-text providers (Azure, Grok, Ollama) have an empty MODEL_OPTIONS list -
  // the user types the model name - so we pass through whatever the DB has.
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
    azureEndpoint: "",
    azureApiVersion: DEFAULT_AZURE_API_VERSION,
    ollamaBaseUrl: "http://localhost:11434",
    embeddingApiKey: "",
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  // PDFs that failed ingestion during submit. Surfaced on Step 5 with a
  // per-file retry; the bot is already created, so this never blocks the wizard.
  const [ingestFailures, setIngestFailures] = useState<IngestFailure[]>([]);
  const [retryingName, setRetryingName] = useState<string | null>(null);
  // Bots are created in draft state; the preview token
  // returned from POST /api/bots powers the private preview URL on Step 5,
  // and the Publish button flips the live switch via POST /publish.
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectProvider(provider: ProviderName) {
    if (!ENABLED_PROVIDERS.has(provider)) return;
    setForm((prev) => ({
      ...prev,
      llmProvider: provider,
      // Azure deployment names are free-text; everyone else picks from a list.
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
      // Knowledge step: at least one of {pasted text, PDFs} must be present.
      return form.contextText.trim().length > 0 || form.pdfFiles.length > 0;
    }
    if (n === 3) return true;
    if (n === 4) {
      // Ollama needs a base URL + model name, but no API key.
      if (form.llmProvider === "ollama") {
        return (
          form.ollamaBaseUrl.trim().length > 0 &&
          form.llmModel.trim().length > 0
        );
      }
      if (form.apiKey.trim().length < 8) return false;
      if (form.llmProvider === "azure") {
        const endpoint = form.azureEndpoint.trim();
        const deployment = form.llmModel.trim();
        return endpoint.startsWith("https://") && deployment.length > 0;
      }
      // Grok takes a free-text model name alongside the key.
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
      // Stash the BYO key in the encrypted IndexedDB store BEFORE
      // the network call - so even if the server request hangs, the key is
      // captured locally for the chat UI.
      await setApiKey(form.apiKey);
      // Azure needs endpoint + apiVersion alongside the key. Store separately
      // so switching providers doesn't wipe the other provider's key.
      if (form.llmProvider === "azure") {
        await setAzureCreds({
          endpoint: form.azureEndpoint,
          apiVersion: form.azureApiVersion || DEFAULT_AZURE_API_VERSION,
        });
      }
      // Ollama needs only its base URL (no key) stored for the chat UI.
      if (form.llmProvider === "ollama") {
        await setOllamaBaseUrl(form.ollamaBaseUrl);
      }
      // RAG: persist the OpenAI embedding key (when supplied) so the
      // chat UI can attach it as `x-embedding-api-key` on every chat request.
      // Empty value clears any previously stored key.
      await setEmbeddingApiKey(form.embeddingApiKey);

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

      // Envelope-encrypt the LLM key on pro-bot.dev so the embed widget can
      // actually answer questions. Only fires when a real provider key is
      // supplied (Ollama doesn't need one). Non-fatal — if the store fails,
      // the bot still saves as a draft. The key is already stashed in the
      // owner's browser (via `setApiKey` above) so the dashboard test chat
      // works either way; the only cost of a failure is that the embed
      // widget can't answer visitors until the owner retries from Settings.
      //
      // Deliberately ignore the `managed_storage_unavailable` (503) case:
      // that fires when the deployment lacks a KEK (typical local-dev
      // setup) - not something the user can fix by re-pasting the key, so
      // surfacing an alarming error just confuses them.
      if (
        form.llmProvider !== "ollama" &&
        form.apiKey.trim().length >= 8
      ) {
        const keyRes = await fetch(`/api/bots/${body.bot.id}/llm-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: form.apiKey.trim() }),
        }).catch(() => null);
        if (!keyRes) {
          setError(
            "Your bot was saved as a draft, but we couldn't reach the server to store your API key. Open Settings → AI Model & Key to try again before publishing.",
          );
        } else if (!keyRes.ok) {
          const keyBody = (await keyRes.json().catch(() => ({}))) as {
            error?: string;
          };
          // 503 managed_storage_unavailable = KEK not configured on this
          // deployment; the browser-side stash already covers the owner's
          // test chat, so treat it as a non-error.
          if (keyBody.error !== "managed_storage_unavailable") {
            setError(
              "Your bot was saved as a draft, but we couldn't store your API key on our server. Open Settings → AI Model & Key to try again before publishing.",
            );
          }
        }
      }

      // Upload the bot picture now the row exists (id known). Non-fatal: on
      // failure the bot simply keeps the default ProBot icon.
      if (form.botImageFile) {
        const avatarForm = new FormData();
        avatarForm.append("file", form.botImageFile, form.botImageFile.name);
        await fetch(`/api/bots/${body.bot.id}/avatar`, {
          method: "POST",
          body: avatarForm,
        }).catch(() => undefined);
      }

      // If PDFs were queued, upload them now that the bot row exists. The server
      // processes each file independently and returns per-file results; we
      // surface any failures inline on Step 5 (retriable) instead of blocking -
      // the good files are already ingested.
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

  // Re-upload a single failed PDF without re-submitting the whole bot. On
  // success the file drops out of the failures list.
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
      // Unpublished drafts have no live public URL — send the owner to the
      // token-signed preview so "Open chat" always lands on a page that
      // actually renders their bot. Once they publish, the public URL is
      // live and preview is unnecessary.
      const target =
        !published && previewToken
          ? `/u/${username}/chat?preview=${encodeURIComponent(previewToken)}`
          : `/u/${username}/chat`;
      router.push(target);
      return;
    }
    if (stepIsValid(step) && step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
    // Step 1 has nowhere to go inside the wizard, so the button acts as
    // "Cancel" and returns to the dashboard. Steps 2-4 walk back through
    // the wizard. Step 5 hides the button entirely - once the bot is
    // deployed there is no editing the create-flow retroactively; edits
    // happen from bot settings.
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
        // The publish endpoint uses `message` for human copy on the
        // needs_managed_key guard; fall through to the raw code otherwise.
        setError(
          body.message ?? body.error ?? "Could not publish your bot. Try again.",
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
    // Desktop: fill the layout's main column (which is itself
    // `calc(100vh - 4rem)`) and hide overflow so the page itself never
    // scrolls. Inside, the grid takes the remaining height after the
    // step strip; each grid column scrolls independently. Mobile: just
    // a natural flex column; document scroll handles overflow.
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <StepperHeader step={step} />

      {/* `lg:min-h-0` is critical - flex children default to
          `min-height: auto`, which prevents them from shrinking below
          their content. Setting `min-h-0` lets the grid actually
          consume `flex-1` so the inner columns' `overflow-y-auto`
          works. */}
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

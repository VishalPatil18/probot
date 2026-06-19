"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PROVIDER_NAMES, type ProviderName } from "@/lib/ai/providers";
import {
  CONTEXT_TOKEN_CAP_DEFAULT,
  CONTEXT_TOKEN_CAP_MAX,
  CONTEXT_TOKEN_CAP_MIN,
  PERSONALITY_PRESETS,
  type Personality,
} from "@/lib/bots/schemas";
import { CopyUrlButton } from "@/components/dashboard/CopyUrlButton";
import { setEmbeddingApiKey } from "@/lib/client/embedding-key-store";
import { setApiKey, setAzureCreds } from "@/lib/client/llm-key-store";
import {
  MAX_PDF_BYTES,
  MAX_PDF_FILES,
  PDF_MIME_TYPE,
} from "@/lib/ingestion/constants";

const TOTAL_STEPS = 5;
const DEFAULT_AZURE_API_VERSION = "2025-01-01-preview";

const PROVIDER_LABELS: Record<ProviderName, { name: string; family: string }> =
  {
    anthropic: { name: "Anthropic", family: "Claude" },
    google: { name: "Google", family: "Gemini" },
    azure: { name: "Azure", family: "OpenAI" },
    openai: { name: "OpenAI", family: "GPT" },
  };

// For Azure the user supplies their deployment name as free text (it IS the
// model), so the dropdown is empty/hidden on that branch.
const MODEL_OPTIONS: Record<ProviderName, string[]> = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-5"],
  openai: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  azure: [],
};

// Stage 1: anthropic, openai, and azure ship real adapters.
// google renders disabled with a "SOON" badge.
const STAGE1_ENABLED: ReadonlySet<ProviderName> = new Set([
  "anthropic",
  "openai",
  "azure",
]);

const PERSONALITY_LABELS: Record<
  Personality,
  { title: string; tagline: string }
> = {
  professional: { title: "Professional", tagline: "Clear & concise" },
  creative: { title: "Creative", tagline: "Warm & expressive" },
  enthusiastic: { title: "Enthusiastic", tagline: "High energy" },
};

type InitialBot = {
  id: string;
  name: string;
  headline: string | null;
  personality: Personality;
  contextText: string;
  contextTokenCap?: number;
  suggestedQuestions: string[] | null;
};

type Props = {
  username: string;
  initialBot?: InitialBot;
  initialLlmProvider?: ProviderName;
  initialLlmModel?: string;
};

type FormState = {
  name: string;
  headline: string;
  personality: Personality;
  contextText: string;
  // PDFs queued in the browser; uploaded after the bot row is created so the
  // /knowledge endpoint can attribute them to a real botId.
  pdfFiles: File[];
  contextTokenCap: number;
  suggestedQuestions: string[];
  llmProvider: ProviderName;
  llmModel: string;
  apiKey: string;
  // Azure-only extras (ignored when llmProvider !== "azure").
  azureEndpoint: string;
  azureApiVersion: string;
  // Stage 3 RAG: optional OpenAI key for embedding generation. When present,
  // the bot uses semantic search over its knowledge at chat time; when empty,
  // it falls back to the full assembled context (legacy path).
  embeddingApiKey: string;
};

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
  // Azure has an empty MODEL_OPTIONS list - the user supplies deployment name
  // as free text, so we pass through whatever the DB has (or empty).
  const providerModels = MODEL_OPTIONS[initialProvider];
  const initialModel =
    initialProvider === "azure"
      ? (initialLlmModel ?? "")
      : initialLlmModel && providerModels.includes(initialLlmModel)
        ? initialLlmModel
        : (providerModels[0] ?? "");
  const [form, setForm] = useState<FormState>({
    name: initialBot?.name ?? "",
    headline: initialBot?.headline ?? "",
    personality: initialBot?.personality ?? "professional",
    contextText: initialBot?.contextText ?? "",
    pdfFiles: [],
    contextTokenCap: initialBot?.contextTokenCap ?? CONTEXT_TOKEN_CAP_DEFAULT,
    suggestedQuestions: initialBot?.suggestedQuestions ?? [],
    llmProvider: initialProvider,
    llmModel: initialModel,
    apiKey: "",
    azureEndpoint: "",
    azureApiVersion: DEFAULT_AZURE_API_VERSION,
    embeddingApiKey: "",
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectProvider(provider: ProviderName) {
    if (!STAGE1_ENABLED.has(provider)) return;
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
      if (form.apiKey.trim().length < 8) return false;
      if (form.llmProvider === "azure") {
        const endpoint = form.azureEndpoint.trim();
        const deployment = form.llmModel.trim();
        return endpoint.startsWith("https://") && deployment.length > 0;
      }
      return true;
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Stash the BYO key in localStorage BEFORE the network call - so even if
      // the server request hangs, the key is captured locally for the chat UI.
      setApiKey(form.apiKey);
      // Azure needs endpoint + apiVersion alongside the key. Store separately
      // so switching providers doesn't wipe the other provider's key.
      if (form.llmProvider === "azure") {
        setAzureCreds({
          endpoint: form.azureEndpoint,
          apiVersion: form.azureApiVersion || DEFAULT_AZURE_API_VERSION,
        });
      }
      // Stage 3 RAG: persist the OpenAI embedding key (when supplied) so the
      // chat UI can attach it as `x-embedding-api-key` on every chat request.
      // Empty value clears any previously stored key.
      setEmbeddingApiKey(form.embeddingApiKey);

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
          llmProvider: form.llmProvider,
          llmModel: form.llmModel,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Could not save your bot. Try again.");
        return;
      }
      const body = (await res.json()) as { bot: { id: string } };

      // If PDFs were queued, upload them now that the bot row exists. The
      // server reassembles `context_text` from all sources, so the manual
      // text is included as a `manual_text` source when present.
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
        if (!kRes.ok) {
          const kBody = (await kRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(
            kBody.error ?? "Bot saved but PDF ingestion failed. Try again.",
          );
          return;
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

  function next() {
    if (step === 4) {
      void submit();
      return;
    }
    if (step === 5) {
      router.push(`/u/${username}/chat`);
      return;
    }
    if (stepIsValid(step) && step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <StepperHeader step={step} />

      <div className="flex-1 grid lg:grid-cols-[1fr_440px] max-w-[1280px] mx-auto w-full">
        <div className="px-6 lg:px-12 py-10 overflow-y-auto">
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
              <StepDeploy username={username} createdBotId={createdBotId} />
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
                className={`btn btn-secondary ${step === 1 || step === 5 ? "invisible" : ""}`}
              >
                Back
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
  if (step === 4) return "Save & deploy";
  if (step === 5) return "Preview bot →";
  return "Continue →";
}

// ── Sub-renderers (kept colocated; no separate files) ────────────────────────

function StepperHeader({ step }: { step: number }) {
  const labels = ["Identity", "Knowledge", "Personality", "AI Model", "Deploy"];
  return (
    <header className="bg-white border-b border-border-base sticky top-0 z-30">
      <div className="px-6 h-16 flex items-center gap-4 max-w-[1280px] mx-auto w-full">
        <span className="font-display text-lg font-extrabold tracking-tight">
          ProBot
        </span>
        <div className="flex-1 flex items-center justify-center gap-3">
          {labels.map((label, i) => {
            const n = i + 1;
            const state =
              n < step ? "done" : n === step ? "current" : "upcoming";
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`size-7 rounded-full grid place-items-center text-xs font-bold ${
                    state === "done"
                      ? "bg-success text-white"
                      : state === "current"
                        ? "bg-brand text-white"
                        : "bg-neutral-100 text-muted"
                  }`}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {state === "done" ? "✓" : n}
                </span>
                <span className="text-sm font-semibold hidden md:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function StepHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-2">
        Step {step} of {TOTAL_STEPS}
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-muted text-sm mb-8">{subtitle}</p>
    </>
  );
}

function StepIdentity({
  form,
  patch,
  username,
}: {
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  username: string;
}) {
  return (
    <section>
      <StepHeading
        step={1}
        title="Who is your bot?"
        subtitle="This is how you'll appear to recruiters."
      />
      <div className="space-y-5">
        <div>
          <label
            htmlFor="bf-name"
            className="block text-xs font-semibold mb-1.5"
          >
            Display name
          </label>
          <input
            id="bf-name"
            type="text"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            maxLength={100}
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="bf-headline"
            className="block text-xs font-semibold mb-1.5"
          >
            Headline{" "}
            <span className="text-muted font-normal">· max 120 chars</span>
          </label>
          <input
            id="bf-headline"
            type="text"
            value={form.headline}
            onChange={(e) => patch("headline", e.target.value)}
            maxLength={120}
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Bot URL</label>
          <div className="flex items-center border border-border-base rounded-xl overflow-hidden bg-neutral-50">
            <span className="pl-3 pr-1 text-sm text-muted">probot.com/u/</span>
            <span className="flex-1 py-2.5 pr-3 text-sm font-mono">
              {username}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Slug comes from your username (Stage 1).
          </p>
        </div>
      </div>
    </section>
  );
}

function StepKnowledge({
  form,
  patch,
}: {
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function addFiles(incoming: FileList | File[]): void {
    setFileError(null);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(incoming)) {
      const isPdf =
        file.type === PDF_MIME_TYPE || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        rejected.push(`${file.name}: not a PDF`);
        continue;
      }
      if (file.size > MAX_PDF_BYTES) {
        rejected.push(
          `${file.name}: exceeds ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)}MB`,
        );
        continue;
      }
      accepted.push(file);
    }
    const merged = [...form.pdfFiles];
    for (const file of accepted) {
      if (merged.length >= MAX_PDF_FILES) {
        rejected.push(`${file.name}: max ${MAX_PDF_FILES} files`);
        continue;
      }
      // Dedupe by filename: replacing earlier add keeps the latest content.
      const without = merged.filter((f) => f.name !== file.name);
      merged.length = 0;
      merged.push(...without, file);
    }
    patch("pdfFiles", merged);
    if (rejected.length > 0) setFileError(rejected.join("; "));
  }

  function removeFile(name: string): void {
    patch(
      "pdfFiles",
      form.pdfFiles.filter((f) => f.name !== name),
    );
  }

  return (
    <section>
      <StepHeading
        step={2}
        title="Feed it your career."
        subtitle="Upload a PDF, paste text, or both. Recruiters' questions get answered from this."
      />
      <div className="space-y-5">
        <div>
          <label
            htmlFor="bf-pdf-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
            }}
            className={`block rounded-2xl p-6 text-center border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-brand bg-brand/5"
                : "border-border-base bg-neutral-50 hover:border-brand/50"
            }`}
          >
            <p className="text-sm font-semibold">
              Drop a PDF here or click to upload
            </p>
            <p className="text-xs text-muted mt-1">
              Resume, LinkedIn profile export, or any PDF with your career info.
              Max {MAX_PDF_FILES} files, {MAX_PDF_BYTES / 1024 / 1024}MB each.
            </p>
            <input
              id="bf-pdf-input"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {form.pdfFiles.length > 0 && (
            <ul className="mt-3 space-y-2">
              {form.pdfFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-3 text-sm border border-border-base rounded-xl px-3 py-2"
                >
                  <span className="truncate">
                    {file.name}{" "}
                    <span className="text-muted text-xs">
                      · {(file.size / 1024).toFixed(0)}KB
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="text-xs text-muted hover:text-error"
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {fileError && (
            <p role="alert" className="mt-2 text-xs text-error">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="bf-ctx"
            className="block text-xs font-semibold mb-1.5"
          >
            Bio / resume text{" "}
            <span className="text-muted font-normal">· max 50,000 chars</span>
          </label>
          <textarea
            id="bf-ctx"
            rows={8}
            value={form.contextText}
            onChange={(e) => patch("contextText", e.target.value)}
            maxLength={50_000}
            placeholder="Paste a bio, key wins, projects, or anything recruiters should know…"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand resize-none"
          />
          <p className="text-[11px] text-muted mt-1.5">
            {form.contextText.length.toLocaleString()} / 50,000
          </p>
        </div>

        <div className="border-t border-border-base pt-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-expanded={advancedOpen}
            className="text-xs font-semibold text-muted hover:text-text-base"
          >
            {advancedOpen ? "▾" : "▸"} Advanced
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-2">
              <label
                htmlFor="bf-token-cap"
                className="block text-xs font-semibold"
              >
                Context token cap
              </label>
              <input
                id="bf-token-cap"
                type="number"
                min={CONTEXT_TOKEN_CAP_MIN}
                max={CONTEXT_TOKEN_CAP_MAX}
                step={1000}
                value={form.contextTokenCap}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(n)) return;
                  const clamped = Math.max(
                    CONTEXT_TOKEN_CAP_MIN,
                    Math.min(CONTEXT_TOKEN_CAP_MAX, n),
                  );
                  patch("contextTokenCap", clamped);
                }}
                className="w-32 py-2 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
              />
              <p className="text-[11px] text-muted">
                Higher values let the bot reference more of your knowledge but
                risk exceeding your LLM's context window - smaller models
                (Haiku, gpt-4o-mini) may refuse responses above ~12K. Default{" "}
                {CONTEXT_TOKEN_CAP_DEFAULT.toLocaleString()}.
              </p>

              <label
                htmlFor="bf-embedding-key"
                className="block text-xs font-semibold pt-3"
              >
                OpenAI key for semantic search (optional)
              </label>
              <input
                id="bf-embedding-key"
                type="password"
                autoComplete="off"
                placeholder="sk-..."
                value={form.embeddingApiKey}
                onChange={(e) => patch("embeddingApiKey", e.target.value)}
                className="w-full py-2 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
              />
              <p className="text-[11px] text-muted">
                When provided, your knowledge is embedded with OpenAI and the
                bot uses semantic search at chat time for more accurate
                answers. Stored in your browser only, never on our servers.
                Leave blank to use full-context (default).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StepPersonality({
  form,
  patch,
  newQuestion,
  setNewQuestion,
  addQuestion,
  removeQuestion,
}: {
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  newQuestion: string;
  setNewQuestion: (v: string) => void;
  addQuestion: () => void;
  removeQuestion: (i: number) => void;
}) {
  return (
    <section>
      <StepHeading
        step={3}
        title="Give it a personality."
        subtitle="Set the tone and add a few suggested questions."
      />
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold mb-2">
            Tone preset
          </label>
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Tone preset"
          >
            {PERSONALITY_PRESETS.map((p) => {
              const meta = PERSONALITY_LABELS[p];
              const active = form.personality === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch("personality", p)}
                  className={`p-3 rounded-xl border-2 text-left ${
                    active
                      ? "border-brand bg-blue-50/50"
                      : "border-border-base hover:border-brand/40"
                  }`}
                >
                  <p className="text-sm font-bold">{meta.title}</p>
                  <p className="text-[11px] text-muted">{meta.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 border border-border-base bg-neutral-50 opacity-60">
          <p className="text-sm font-semibold">
            Theme color & custom instructions - Stage 7
          </p>
          <p className="text-xs text-muted mt-1">
            Lands with the settings page.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">
            Suggested questions{" "}
            <span className="text-muted font-normal">
              · {form.suggestedQuestions.length} / 6
            </span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.suggestedQuestions.map((q, i) => (
              <span
                key={`${q}-${i}`}
                className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs font-medium flex items-center gap-1.5"
              >
                {q}
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  aria-label={`Remove ${q}`}
                  className="text-muted hover:text-ink"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={200}
              placeholder="e.g. What are her top skills?"
              className="flex-1 py-2 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addQuestion();
                }
              }}
            />
            <button
              type="button"
              onClick={addQuestion}
              disabled={form.suggestedQuestions.length >= 6}
              className="btn btn-secondary !px-4 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepAIModel({
  form,
  patch,
  selectProvider,
}: {
  form: FormState;
  patch: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  selectProvider: (p: ProviderName) => void;
}) {
  const models = MODEL_OPTIONS[form.llmProvider];
  const providerLabel = PROVIDER_LABELS[form.llmProvider].name;

  return (
    <section>
      <StepHeading
        step={4}
        title="Choose your AI model."
        subtitle="ProBot runs on your own LLM key. Pick a provider and paste your key - it's stored locally and never tracked by ProBot."
      />
      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 mb-6 text-[13px] leading-relaxed">
        Your key stays on this device. It's saved to local storage and used only
        to call the model directly - <strong>never</strong> sent to or logged by
        ProBot.
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold mb-2">Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROVIDER_NAMES.map((p) => {
              const enabled = STAGE1_ENABLED.has(p);
              const active = form.llmProvider === p;
              const meta = PROVIDER_LABELS[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectProvider(p)}
                  disabled={!enabled}
                  className={`relative p-3 rounded-xl border-2 text-center transition-colors ${
                    active
                      ? "border-brand bg-blue-50/50"
                      : enabled
                        ? "border-border-base hover:border-brand/40"
                        : "border-border-base opacity-50 cursor-not-allowed"
                  }`}
                >
                  {!enabled && (
                    <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-muted text-white px-1.5 py-0.5 rounded-full">
                      SOON
                    </span>
                  )}
                  <p className="text-sm font-bold">{meta.name}</p>
                  <p className="text-[11px] text-muted">{meta.family}</p>
                </button>
              );
            })}
          </div>
        </div>

        {form.llmProvider === "azure" ? (
          <>
            <div>
              <label
                htmlFor="bf-az-endpoint"
                className="block text-xs font-semibold mb-1.5"
              >
                Azure endpoint
              </label>
              <input
                id="bf-az-endpoint"
                type="url"
                value={form.azureEndpoint}
                onChange={(e) => patch("azureEndpoint", e.target.value)}
                maxLength={512}
                placeholder="https://your-resource.cognitiveservices.azure.com"
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted mt-1.5">Must use https://</p>
            </div>
            <div>
              <label
                htmlFor="bf-az-deployment"
                className="block text-xs font-semibold mb-1.5"
              >
                Deployment name
              </label>
              <input
                id="bf-az-deployment"
                type="text"
                value={form.llmModel}
                onChange={(e) => patch("llmModel", e.target.value)}
                maxLength={60}
                placeholder="gpt-4o-mini"
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted mt-1.5">
                The name you gave the deployment in Azure (it is also the model
                id sent in requests).
              </p>
            </div>
            <div>
              <label
                htmlFor="bf-az-version"
                className="block text-xs font-semibold mb-1.5"
              >
                API version
              </label>
              <input
                id="bf-az-version"
                type="text"
                value={form.azureApiVersion}
                onChange={(e) => patch("azureApiVersion", e.target.value)}
                maxLength={64}
                placeholder={DEFAULT_AZURE_API_VERSION}
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
            </div>
          </>
        ) : (
          <div>
            <label
              htmlFor="bf-model"
              className="block text-xs font-semibold mb-1.5"
            >
              Model
            </label>
            <select
              id="bf-model"
              value={form.llmModel}
              onChange={(e) => patch("llmModel", e.target.value)}
              className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand bg-white"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="bf-key"
            className="block text-xs font-semibold mb-1.5"
          >
            {providerLabel} API key
          </label>
          <input
            id="bf-key"
            type="password"
            value={form.apiKey}
            onChange={(e) => patch("apiKey", e.target.value)}
            maxLength={256}
            placeholder={
              form.llmProvider === "azure" ? "your azure key" : "sk-…"
            }
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
            autoComplete="off"
          />
          <p className="text-[11px] text-muted mt-1.5">
            Stored locally · never tracked by ProBot
          </p>
        </div>
      </div>
    </section>
  );
}

function StepDeploy({
  username,
  createdBotId,
}: {
  username: string;
  createdBotId: string | null;
}) {
  // Stage 4: build the real public URL from the current origin so localhost
  // dev, preview deploys, and prod all show the right share link.
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://probot.dev";
  const url = `${origin}/u/${username}/chat`;
  return (
    <section>
      <StepHeading
        step={5}
        title="Ready to deploy 🚀"
        subtitle="Your bot is saved. Share the link below."
      />
      <div className="space-y-5">
        {createdBotId && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
            <span aria-hidden>✓</span>
            <div>
              <p className="text-sm font-bold">Bot saved</p>
              <p className="text-xs text-muted">Bot id: {createdBotId}</p>
            </div>
          </div>
        )}
        <div>
          <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Your bot link
          </label>
          <div className="flex items-center gap-2 mt-1.5 border border-border-base rounded-xl px-3 py-2.5 bg-white">
            <span className="text-sm font-mono flex-1 truncate">{url}</span>
            <CopyUrlButton url={url} />
          </div>
        </div>
        <div className="rounded-xl p-4 border border-border-base bg-neutral-50 opacity-60">
          <p className="text-sm font-semibold">Embed code - Stage 5</p>
          <p className="text-xs text-muted mt-1">Lands with the widget.</p>
        </div>
      </div>
    </section>
  );
}

function LivePreview({ form }: { form: FormState }) {
  const name = form.name.trim() || "Your name";
  const headline = form.headline.trim() || "Your headline";
  const initials = useMemo(() => {
    const parts = (form.name || "Your Name").trim().split(/\s+/);
    return `${parts[0]?.[0] ?? "Y"}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }, [form.name]);

  return (
    <div className="hidden lg:flex border-l border-border-base bg-white flex-col items-center justify-center p-8">
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">
        Live preview
      </p>
      <div className="w-full max-w-[340px] bg-white rounded-2xl border border-border-base shadow-floating overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-base">
          <div className="size-10 rounded-full brand-blue-gradient grid place-items-center text-white font-display font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{name}</p>
            <p className="text-[11px] text-muted truncate">{headline}</p>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2.5 bg-bg-app/40 min-h-[180px]">
          <div className="px-3 py-2 text-xs rounded-2xl bg-neutral-100 w-fit max-w-[85%]">
            👋 Hi! Ask me anything.
          </div>
          {form.suggestedQuestions[0] && (
            <div className="px-3 py-2 text-xs rounded-2xl bg-brand text-white w-fit max-w-[85%] ml-auto">
              {form.suggestedQuestions[0]}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border-base flex items-center gap-2">
          <span className="text-xs text-muted flex-1">Ask anything…</span>
        </div>
      </div>
      <p className="text-xs text-muted mt-4 text-center max-w-[300px]">
        Updates as you type.
      </p>
    </div>
  );
}

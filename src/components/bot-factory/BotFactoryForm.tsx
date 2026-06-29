"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeColorField } from "@/components/dashboard/settings/ThemeColorField";

import { PROVIDER_NAMES, type ProviderName } from "@/lib/ai/providers";
import {
  CONTEXT_TOKEN_CAP_DEFAULT,
  CONTEXT_TOKEN_CAP_MAX,
  CONTEXT_TOKEN_CAP_MIN,
  CUSTOM_INSTRUCTIONS_MAX,
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

// All four providers ship real adapters now. The Set is
// kept (rather than dropped) so a future "experimental" / "beta" gate has
// a single place to live without rewiring the JSX.
const STAGE1_ENABLED: ReadonlySet<ProviderName> = new Set([
  "anthropic",
  "openai",
  "azure",
  "google",
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
  customInstructions?: string | null;
  themeColor?: string;
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
  // Bot picture chosen in Step 1; uploaded after the bot row is created (we
  // need its id). Null = keep the default ProBot icon.
  botImageFile: File | null;
  // Per-bot theme color picked in Step 3.
  themeColor: string;
  contextText: string;
  // PDFs queued in the browser; uploaded after the bot row is created so the
  // /knowledge endpoint can attribute them to a real botId.
  pdfFiles: File[];
  contextTokenCap: number;
  suggestedQuestions: string[];
  // Optional free-form prompt addendum captured on Step 3.
  customInstructions: string;
  llmProvider: ProviderName;
  llmModel: string;
  apiKey: string;
  // Azure-only extras (ignored when llmProvider !== "azure").
  azureEndpoint: string;
  azureApiVersion: string;
  // RAG: optional OpenAI key for embedding generation. When present,
  // the bot uses semantic search over its knowledge at chat time; when empty,
  // it falls back to the full assembled context (legacy path).
  embeddingApiKey: string;
};

// Per-file result shape returned by POST /api/bots/[botId]/knowledge.
type IngestFileResult = {
  name: string;
  ok: boolean;
  error?: string;
  category?: string;
};

type IngestFailure = { name: string; error: string };

const INGEST_MESSAGES: Record<string, string> = {
  file_too_large: "Too large to process.",
  invalid_file_type: "Not a valid PDF.",
  pdf_unreadable: "Couldn't read this PDF (encrypted or corrupt).",
  empty_extract: "No readable text found in this PDF.",
  too_many_files: "Too many files.",
  empty_input: "The file was empty.",
};

function describeIngestFailure(file: IngestFileResult): string {
  return (
    (file.category ? INGEST_MESSAGES[file.category] : undefined) ??
    "Couldn't process this file."
  );
}

function collectFailures(
  files: IngestFileResult[] | undefined,
): IngestFailure[] {
  return (files ?? [])
    .filter((f) => !f.ok)
    .map((f) => ({ name: f.name, error: describeIngestFailure(f) }));
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
      router.push(`/u/${username}/chat`);
      return;
    }
    if (stepIsValid(step) && step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
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
        };
        setError(body.error ?? "Could not publish your bot. Try again.");
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
  if (step === 4) return "Save as draft";
  if (step === 5) return "Open chat →";
  return "Continue →";
}

// ── Sub-renderers (kept colocated; no separate files) ────────────────────────

function StepperHeader({ step }: { step: number }) {
  const labels = ["Identity", "Knowledge", "Personality", "AI Model", "Deploy"];
  // Mobile: `sticky top-16` so the strip stays visible just under the
  // dashboard topbar while the document scrolls.
  // Desktop: `lg:static` - the parent BotFactory wrapper is fixed-height
  // and doesn't scroll, so sticky has nothing to do; the strip simply
  // sits as the first flex child above the scrolling grid columns.
  // ProBot branding lives in the sidebar - no need to duplicate it here.
  return (
    <header className="bg-white border-b border-border-base sticky top-16 z-20 lg:static lg:z-auto shrink-0">
      <div className="px-6 h-14 flex items-center max-w-[1280px] mx-auto w-full">
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
          <label className="block text-xs font-semibold mb-1.5">
            Bot picture
          </label>
          <div className="flex items-center gap-4">
            <BotAvatarPreview file={form.botImageFile} />
            <div>
              <label
                htmlFor="bf-avatar"
                className="btn btn-secondary !py-2 inline-block cursor-pointer text-xs"
              >
                {form.botImageFile ? "Change picture" : "Upload picture"}
                <input
                  id="bf-avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) patch("botImageFile", file);
                  }}
                />
              </label>
              {form.botImageFile ? (
                <button
                  type="button"
                  onClick={() => patch("botImageFile", null)}
                  className="ml-2 text-xs text-muted hover:text-error"
                >
                  Remove
                </button>
              ) : null}
              <p className="mt-1 text-[11px] text-muted">
                Defaults to the ProBot icon · JPG/PNG/WebP · 2 MB
              </p>
            </div>
          </div>
        </div>
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
            <span className="pl-3 pr-1 text-sm text-muted">pro-bot.dev/u/</span>
            <span className="flex-1 py-2.5 pr-3 text-sm font-mono">
              {username}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Slug comes from your username.
          </p>
        </div>
      </div>
    </section>
  );
}

// Live preview of the chosen bot picture (or the default ProBot mark). Manages
// the object URL lifecycle so the blob is revoked when the file changes/clears.
function BotAvatarPreview({
  file,
  sizeClass = "size-16",
  themeColor,
}: {
  file: File | null;
  sizeClass?: string;
  themeColor?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Bot picture preview"
        className={`${sizeClass} shrink-0 rounded-full border border-border-base object-cover`}
      />
    );
  }
  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-full ${
        themeColor ? "" : "brand-blue-gradient"
      }`}
      style={themeColor ? { background: themeColor } : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-3/5 w-3/5">
        <circle cx="14" cy="20" r="3.4" fill="#fff" />
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
      </svg>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IngestFailuresPanel({
  failures,
  retryingName,
  onRetry,
}: {
  failures: IngestFailure[];
  retryingName: string | null;
  onRetry: (name: string) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">
        Some files couldn&apos;t be processed
      </p>
      <p className="mt-0.5 text-xs text-amber-800">
        Your bot was created and the rest of your knowledge is saved. Retry the
        files below, or fix and re-upload them later from settings.
      </p>
      <ul className="mt-3 space-y-2">
        {failures.map((f) => (
          <li
            key={f.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium">{f.name}</span>{" "}
              <span className="text-muted">· {f.error}</span>
            </span>
            <button
              type="button"
              onClick={() => onRetry(f.name)}
              disabled={retryingName !== null}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              {retryingName === f.name ? "Retrying…" : "Retry"}
            </button>
          </li>
        ))}
      </ul>
    </div>
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
                    className="shrink-0 text-red-600 transition-colors hover:text-red-700"
                    aria-label={`Remove ${file.name}`}
                  >
                    <TrashIcon />
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
                bot uses semantic search at chat time for more accurate answers.
                Stored in your browser only, never on our servers. Leave blank
                to use full-context (default).
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

        <div>
          <label
            htmlFor="bf-custom-instructions"
            className="block text-xs font-semibold mb-1.5"
          >
            Custom instructions{" "}
            <span className="text-muted font-normal">
              · optional, max {CUSTOM_INSTRUCTIONS_MAX.toLocaleString()} chars
            </span>
          </label>
          <textarea
            id="bf-custom-instructions"
            rows={3}
            value={form.customInstructions}
            onChange={(e) => patch("customInstructions", e.target.value)}
            maxLength={CUSTOM_INSTRUCTIONS_MAX}
            placeholder="Always be honest about what's in my data; if unsure, point recruiters to email me directly."
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand resize-none"
          />
          <p className="text-[11px] text-muted mt-1.5">
            Added to the system prompt below personality. Safety rules still
            win. You can edit this later in settings.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">
            Theme color
          </label>
          <ThemeColorField
            value={form.themeColor}
            onChange={(hex) => patch("themeColor", hex)}
          />
          <p className="text-[11px] text-muted mt-1.5">
            Used by your embeddable widget and email signature badge.
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
  previewToken,
  published,
  publishing,
  onPublish,
}: {
  username: string;
  createdBotId: string | null;
  previewToken: string | null;
  published: boolean;
  publishing: boolean;
  onPublish: () => void;
}) {
  // Build the real public URL from the current origin so localhost
  // dev, preview deploys, and prod all show the right share link.
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://pro-bot.dev";
  const publicUrl = `${origin}/u/${username}/chat`;
  const previewUrl = previewToken
    ? `${publicUrl}?preview=${encodeURIComponent(previewToken)}`
    : null;
  return (
    <section>
      <StepHeading
        step={5}
        title={published ? "Bot is live 🚀" : "Preview before you publish"}
        subtitle={
          published
            ? "Your bot is published and the public link is live."
            : "Try your bot privately. Recruiters can't reach the public URL until you publish."
        }
      />
      <div className="space-y-5">
        {createdBotId && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              published
                ? "bg-success/10 border-success/20"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <span aria-hidden>{published ? "✓" : "✎"}</span>
            <div>
              <p className="text-sm font-bold">
                {published ? "Bot published" : "Bot saved as draft"}
              </p>
              <p className="text-xs text-muted">
                {published
                  ? "Anyone with the link below can chat with your bot."
                  : "Publishing flips the public link on. You can republish or unpublish anytime from settings."}
              </p>
            </div>
          </div>
        )}

        {!published && previewUrl ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Private preview link
            </label>
            <div className="flex items-center gap-2 mt-1.5 border border-amber-200 rounded-xl px-3 py-2.5 bg-amber-50">
              <span className="text-sm font-mono flex-1 truncate">
                {previewUrl}
              </span>
              <CopyUrlButton url={previewUrl} />
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Token-signed; only people you share this link with can chat with
              the draft.
            </p>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="btn btn-primary mt-4 disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish bot"}
            </button>
          </div>
        ) : null}

        {published ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Your bot link
            </label>
            <div className="flex items-center gap-2 mt-1.5 border border-border-base rounded-xl px-3 py-2.5 bg-white">
              <span className="text-sm font-mono flex-1 truncate">
                {publicUrl}
              </span>
              <CopyUrlButton url={publicUrl} />
            </div>
          </div>
        ) : null}

        {createdBotId ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Embed code
            </label>
            <div className="mt-1.5 rounded-xl border border-border-base bg-neutral-900 p-3.5 ring-1 ring-white/10">
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-neutral-100">
                  <code>{`<script src="${origin}/widget.js" data-bot-id="${createdBotId}"></script>`}</code>
                </pre>
                <CopyUrlButton
                  url={`<script src="${origin}/widget.js" data-bot-id="${createdBotId}"></script>`}
                  label="Copy embed"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Paste before the closing <code>&lt;/body&gt;</code> tag on your site
              to drop in a floating chat bubble pre-configured with your bot.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-4 border border-border-base bg-neutral-50 opacity-60">
            <p className="text-sm font-semibold">Embed code</p>
            <p className="text-xs text-muted mt-1">
              Save your bot to generate the embed snippet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function LivePreview({ form }: { form: FormState }) {
  const name = form.name.trim() || "Your name";
  const headline = form.headline.trim() || "Your headline";

  return (
    // `lg:overflow-y-auto` - internal scroll if the preview card ever
    // grows past the column's available height (Bot Factory wrapper is
    // fixed at `lg:h-full`, so each grid column gets its own scroll).
    <div className="hidden lg:flex border-l border-border-base bg-white flex-col items-center justify-center p-8 lg:overflow-y-auto">
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">
        Live preview
      </p>
      <div className="w-full max-w-[340px] bg-white rounded-2xl border border-border-base shadow-floating overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-base">
          <BotAvatarPreview
            file={form.botImageFile}
            sizeClass="size-10"
            themeColor={form.themeColor}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{name}</p>
            <p className="text-[11px] text-muted truncate">{headline}</p>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2.5 bg-bg-app/40 min-h-[180px]">
          <div className="px-3 py-2 text-xs rounded-2xl bg-neutral-100 w-fit max-w-[85%]">
            👋 Hi! Ask me anything.
          </div>
          {form.suggestedQuestions.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5 pt-1">
              {form.suggestedQuestions.map((q, i) => (
                <span
                  key={`${q}-${i}`}
                  className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: form.themeColor, color: form.themeColor }}
                >
                  {q}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="px-4 py-3 border-t border-border-base flex items-center gap-2">
          <span className="text-xs text-muted flex-1">Ask anything…</span>
          <span
            className="size-7 shrink-0 rounded-lg"
            style={{ background: form.themeColor }}
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="text-xs text-muted mt-4 text-center max-w-[300px]">
        Updates as you type.
      </p>
    </div>
  );
}

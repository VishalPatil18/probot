"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";

import type { Personality } from "@/lib/bots/schemas";
import {
  CUSTOM_INSTRUCTIONS_MAX,
  PERSONALITY_PRESETS,
  RATE_LIMIT_MAX_CHARS_MAX,
  RATE_LIMIT_PER_DAY_MAX,
  RATE_LIMIT_PER_MINUTE_MAX,
} from "@/lib/bots/schemas";
import {
  MAX_CHARS_DEFAULT,
  PER_DAY_DEFAULT,
  PER_MINUTE_DEFAULT,
} from "@/lib/ai/rate-limit";

import { AvatarUploader } from "./AvatarUploader";
import { ThemeColorField } from "./ThemeColorField";

import { DeleteBotModal } from "../DeleteBotModal";
import { SuggestedQuestionsEditor } from "../SuggestedQuestionsEditor";

type Props = {
  botId: string;
  ownerUsername: string;
  initialImage: string | null;
  initialName: string;
  initialHeadline: string;
  initialPersonality: Personality;
  initialSuggestedQuestions: string[];
  initialIsActive: boolean;
  initialThemeColor: string;
  initialCustomInstructions: string;
  initialRateLimitPerMinute: number | null;
  initialRateLimitPerDay: number | null;
  initialRateLimitMaxChars: number | null;
  previewToken: string | null;
};

// Each editable card saves on its own; this keys the per-section save state.
type SectionKey = "identity" | "personality" | "limits" | "questions";

const PERSONALITY_CARDS: Record<
  Personality,
  { title: string; icon: ReactNode }
> = {
  professional: {
    title: "Professional",
    icon: <path d="M16 11V7a4 4 0 0 0-8 0v4M8 11h8M5 11h14l-1 9H6l-1-9z" />,
  },
  creative: {
    title: "Creative",
    icon: (
      <>
        <circle cx="13.5" cy="6.5" r="2" />
        <circle cx="6.5" cy="11.5" r="2" />
        <circle cx="17.5" cy="13.5" r="2" />
        <path d="M11 22a8 8 0 1 1 0-16" />
      </>
    ),
  },
  enthusiastic: {
    title: "Enthusiastic",
    icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  },
};

// Default bot mark shown when no custom picture is set (the two-dot ProBot eye).
function ProBotMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="14" cy="20" r="3.4" fill="#fff" />
      <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
    </svg>
  );
}

// Bot Configuration tab. Single PATCH per save, diffed against
// initial values so only changed fields are sent. A future change enables the
// previously-disabled custom-instructions textarea, adds a per-bot rate-
// limit panel, and (for draft bots) surfaces a Publish button alongside
// the preview link.
export function BotConfigTab({
  botId,
  ownerUsername,
  initialImage,
  initialName,
  initialHeadline,
  initialPersonality,
  initialSuggestedQuestions,
  initialIsActive,
  initialThemeColor,
  initialCustomInstructions,
  initialRateLimitPerMinute,
  initialRateLimitPerDay,
  initialRateLimitMaxChars,
  previewToken,
}: Props) {
  const router = useRouter();
  // State seeded from props once; subsequent prop changes do NOT clobber
  // user edits (same pattern as slice-6.5 BotSettingsForm).
  const [isActive, setIsActive] = useState(initialIsActive);
  // The status toggle auto-saves on click (independent of "Save bot settings"),
  // so we track its own committed baseline. The main dirty/patch diff uses this
  // baseline, so a status flip never leaves the Save button stuck "dirty".
  const [activeBaseline, setActiveBaseline] = useState(initialIsActive);
  const [statusSaving, setStatusSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [personality, setPersonality] =
    useState<Personality>(initialPersonality);
  const [suggestedQuestions, setSuggestedQuestions] = useState(
    initialSuggestedQuestions,
  );
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [customInstructions, setCustomInstructions] = useState(
    initialCustomInstructions,
  );
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState<string>(
    initialRateLimitPerMinute === null ? "" : String(initialRateLimitPerMinute),
  );
  const [rateLimitPerDay, setRateLimitPerDay] = useState<string>(
    initialRateLimitPerDay === null ? "" : String(initialRateLimitPerDay),
  );
  const [rateLimitMaxChars, setRateLimitMaxChars] = useState<string>(
    initialRateLimitMaxChars === null ? "" : String(initialRateLimitMaxChars),
  );
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null);
  const [sectionError, setSectionError] = useState<{
    key: SectionKey;
    msg: string;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState(initialName);
  const [presetStatus, setPresetStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (savedSection === null) return;
    const t = setTimeout(() => setSavedSection(null), 1500);
    return () => clearTimeout(t);
  }, [savedSection]);

  // Snapshot the current configuration into a reusable preset (no secrets).
  async function handleSaveAsPreset() {
    const trimmed = presetName.trim();
    if (trimmed.length === 0 || presetStatus === "saving") return;
    setPresetStatus("saving");
    try {
      const res = await fetch("/api/bot-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          settings: {
            name,
            headline,
            personality,
            suggestedQuestions,
            themeColor,
            customInstructions,
            rateLimitPerMinute,
            rateLimitPerDay,
            rateLimitMaxChars,
          },
        }),
      });
      setPresetStatus(res.ok ? "saved" : "error");
    } catch {
      setPresetStatus("error");
    }
  }

  // Each card tracks its own unsaved-changes state so its Save button only
  // enables for edits in that section. The status toggle auto-saves and is
  // excluded here.
  const identityDirty =
    name !== initialName || headline !== initialHeadline;
  const personalityDirty =
    personality !== initialPersonality ||
    customInstructions !== initialCustomInstructions ||
    themeColor !== initialThemeColor;
  const limitsDirty =
    rateLimitPerMinute !==
      (initialRateLimitPerMinute === null
        ? ""
        : String(initialRateLimitPerMinute)) ||
    rateLimitPerDay !==
      (initialRateLimitPerDay === null
        ? ""
        : String(initialRateLimitPerDay)) ||
    rateLimitMaxChars !==
      (initialRateLimitMaxChars === null
        ? ""
        : String(initialRateLimitMaxChars));
  const questionsDirty = !arraysEqual(
    suggestedQuestions,
    initialSuggestedQuestions,
  );

  function parseLimitField(
    raw: string,
    max: number,
  ): { ok: true; value: number | null } | { ok: false; reason: string } {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return { ok: true, value: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        reason: "Rate limits must be positive whole numbers (or blank).",
      };
    }
    if (n > max) {
      return {
        ok: false,
        reason: `Rate limits cap at ${max.toLocaleString()}.`,
      };
    }
    return { ok: true, value: n };
  }

  // Shared PATCH for one section. Sends only the fields that changed; the
  // endpoint is the same per-bot PATCH used by every section. An empty patch
  // (e.g. only whitespace changed) is treated as an immediate no-op success.
  async function commit(
    key: SectionKey,
    patch: Record<string, unknown>,
  ): Promise<void> {
    if (Object.keys(patch).length === 0) {
      setSectionError(null);
      setSavedSection(key);
      return;
    }
    setSavingSection(key);
    setSectionError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setSectionError({
          key,
          msg: "Couldn't save changes. Please try again.",
        });
        return;
      }
      setSavedSection(key);
      router.refresh();
    } catch {
      setSectionError({ key, msg: "Network error. Please try again." });
    } finally {
      setSavingSection(null);
    }
  }

  function saveIdentity() {
    if (!identityDirty || savingSection) return;
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setSectionError({ key: "identity", msg: "Bot name is required." });
      return;
    }
    const patch: Record<string, unknown> = {};
    if (trimmedName !== initialName) patch.name = trimmedName;
    if (headline !== initialHeadline) patch.headline = headline;
    void commit("identity", patch);
  }

  function savePersonality() {
    if (!personalityDirty || savingSection) return;
    if (customInstructions.length > CUSTOM_INSTRUCTIONS_MAX) {
      setSectionError({
        key: "personality",
        msg: `Custom instructions must be ≤ ${CUSTOM_INSTRUCTIONS_MAX} chars.`,
      });
      return;
    }
    const patch: Record<string, unknown> = {};
    if (personality !== initialPersonality) patch.personality = personality;
    if (customInstructions !== initialCustomInstructions) {
      patch.customInstructions = customInstructions;
    }
    if (themeColor !== initialThemeColor) patch.themeColor = themeColor;
    void commit("personality", patch);
  }

  function saveLimits() {
    if (!limitsDirty || savingSection) return;
    const perMinute = parseLimitField(
      rateLimitPerMinute,
      RATE_LIMIT_PER_MINUTE_MAX,
    );
    const perDay = parseLimitField(rateLimitPerDay, RATE_LIMIT_PER_DAY_MAX);
    const maxChars = parseLimitField(
      rateLimitMaxChars,
      RATE_LIMIT_MAX_CHARS_MAX,
    );
    if (!perMinute.ok) {
      setSectionError({ key: "limits", msg: perMinute.reason });
      return;
    }
    if (!perDay.ok) {
      setSectionError({ key: "limits", msg: perDay.reason });
      return;
    }
    if (!maxChars.ok) {
      setSectionError({ key: "limits", msg: maxChars.reason });
      return;
    }
    const patch: Record<string, unknown> = {};
    if (perMinute.value !== initialRateLimitPerMinute) {
      patch.rateLimitPerMinute = perMinute.value;
    }
    if (perDay.value !== initialRateLimitPerDay) {
      patch.rateLimitPerDay = perDay.value;
    }
    if (maxChars.value !== initialRateLimitMaxChars) {
      patch.rateLimitMaxChars = maxChars.value;
    }
    void commit("limits", patch);
  }

  function saveQuestions() {
    if (!questionsDirty || savingSection) return;
    void commit("questions", { suggestedQuestions });
  }

  async function handleDeleteBot() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Couldn't delete this bot. Please try again.");
        return;
      }
      setDeleteOpen(false);
      router.push("/dashboard/bots/new");
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // Auto-save the live/off status immediately on toggle - no "Save" needed.
  async function handleToggleStatus(next: boolean) {
    if (statusSaving) return;
    const prev = isActive;
    setIsActive(next); // optimistic
    setStatusSaving(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        setIsActive(prev); // revert
        setStatusError("Couldn't update status. Please try again.");
        return;
      }
      setActiveBaseline(next);
      router.refresh();
    } catch {
      setIsActive(prev);
      setStatusError("Network error. Please try again.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handlePublish() {
    if (publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        setPublishError("Couldn't publish. Please try again.");
        return;
      }
      setIsActive(true);
      setActiveBaseline(true);
      router.refresh();
    } catch {
      setPublishError("Network error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const previewUrl = previewToken
    ? `/u/${ownerUsername}/chat?preview=${encodeURIComponent(previewToken)}`
    : null;

  return (
    <div className="space-y-6">
      {!initialIsActive && previewUrl ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"
            >
              ✎
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-amber-900">Draft - not yet live</h3>
              <p className="mt-1 text-sm text-amber-900/80">
                Your bot is private until you publish. Use the preview link to
                chat with it; recruiters can&apos;t reach the public URL until
                you click Publish.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-amber-900 underline underline-offset-4 hover:no-underline"
                >
                  Open private preview ↗
                </a>
                <span className="hidden text-amber-900/40 sm:inline">·</span>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {publishing ? "Publishing…" : "Publish bot"}
                </button>
              </div>
              {publishError ? (
                <p role="alert" className="mt-2 text-sm text-rose-700">
                  {publishError}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold">Bot status</h3>
          {/* Plain <div>, not <label> - the Toggle button is its own
              labelled control via aria-label. Wrapping it in a <label>
              creates a redundant-click hazard on some AT configurations
              (the label fires a synthetic click on the inner button). */}
          <div className="flex items-center gap-2 text-sm">
            <span className={isActive ? "text-success" : "text-muted"}>
              {isActive ? "Live" : "Off"}
            </span>
            <Toggle
              checked={isActive}
              onChange={handleToggleStatus}
              ariaLabel="Bot status"
            />
          </div>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div>
            <p className="mb-1.5 text-xs font-semibold">Bot picture</p>
            <AvatarUploader
              initialImage={initialImage}
              uploadUrl={`/api/bots/${botId}/avatar`}
              ariaLabel="Change bot picture"
              fallback={
                <div className="brand-blue-gradient grid size-full place-items-center rounded-full">
                  <ProBotMark />
                </div>
              }
            />
          </div>
          <div className="grid flex-1 content-start gap-4 sm:grid-cols-2">
            <LabeledInput
              label="Bot name"
              value={name}
              onChange={setName}
              maxLength={100}
            />
            <LabeledInput
              label="Headline"
              value={headline}
              onChange={setHeadline}
              maxLength={120}
              placeholder="e.g. ML Engineer · San Francisco"
            />
          </div>
        </div>
        {statusError ? (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            {statusError}
          </p>
        ) : null}
        <SaveButton
          dirty={identityDirty}
          saving={savingSection === "identity"}
          saved={savedSection === "identity"}
          error={sectionError?.key === "identity" ? sectionError.msg : null}
          onClick={saveIdentity}
        />
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Personality</h3>
        <p className="mb-5 text-xs text-muted">
          How your bot speaks to recruiters.
        </p>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {PERSONALITY_PRESETS.map((preset) => {
            const card = PERSONALITY_CARDS[preset];
            const checked = personality === preset;
            return (
              <label
                key={preset}
                className={`block cursor-pointer rounded-xl border-2 p-3 transition-colors ${
                  checked
                    ? "border-brand bg-blue-50/50"
                    : "border-border-base hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  name="personality"
                  value={preset}
                  checked={checked}
                  onChange={() => setPersonality(preset)}
                  className="sr-only"
                />
                <svg
                  aria-hidden
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={checked ? "text-brand" : "text-muted"}
                >
                  {card.icon}
                </svg>
                <p className="mt-1 text-sm font-bold">{card.title}</p>
              </label>
            );
          })}
        </div>

        <div className="mb-5">
          <label
            htmlFor="custom-instructions"
            className="mb-1.5 flex items-center gap-2 text-xs font-semibold"
          >
            Custom instructions{" "}
            <span className="font-normal text-muted">
              · optional, max {CUSTOM_INSTRUCTIONS_MAX.toLocaleString()} chars
            </span>
          </label>
          <textarea
            id="custom-instructions"
            rows={4}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            maxLength={CUSTOM_INSTRUCTIONS_MAX}
            placeholder="Always be honest about what's in my data; if unsure, point recruiters to email me directly."
            className="thin-scroll w-full resize-y rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <p className="mt-1 text-[11px] text-muted">
            Added to the bot&apos;s system prompt below personality. The
            immutable safety rules still take precedence.
          </p>
          <p className="mt-1 text-right text-[11px] text-muted">
            {customInstructions.length.toLocaleString()} /{" "}
            {CUSTOM_INSTRUCTIONS_MAX.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold">
            Theme color
          </label>
          <ThemeColorField value={themeColor} onChange={setThemeColor} />
        </div>
        <SaveButton
          dirty={personalityDirty}
          saving={savingSection === "personality"}
          saved={savedSection === "personality"}
          error={sectionError?.key === "personality" ? sectionError.msg : null}
          onClick={savePersonality}
        />
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Rate limits</h3>
        <p className="mb-5 text-xs text-muted">
          Protect your LLM credits. Blank = use the server default. Limits
          apply per bot, not per recruiter.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <RateLimitField
            label="Per minute"
            placeholderDefault={PER_MINUTE_DEFAULT}
            value={rateLimitPerMinute}
            onChange={setRateLimitPerMinute}
            max={RATE_LIMIT_PER_MINUTE_MAX}
          />
          <RateLimitField
            label="Per day"
            placeholderDefault={PER_DAY_DEFAULT}
            value={rateLimitPerDay}
            onChange={setRateLimitPerDay}
            max={RATE_LIMIT_PER_DAY_MAX}
          />
          <RateLimitField
            label="Max chars / message"
            placeholderDefault={MAX_CHARS_DEFAULT}
            value={rateLimitMaxChars}
            onChange={setRateLimitMaxChars}
            max={RATE_LIMIT_MAX_CHARS_MAX}
          />
        </div>
        <SaveButton
          dirty={limitsDirty}
          saving={savingSection === "limits"}
          saved={savedSection === "limits"}
          error={sectionError?.key === "limits" ? sectionError.msg : null}
          onClick={saveLimits}
        />
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Suggested questions</h3>
        <p className="mb-4 text-xs text-muted">
          These appear under the chat intro to help recruiters get started.
        </p>
        <SuggestedQuestionsEditor
          value={suggestedQuestions}
          onChange={setSuggestedQuestions}
        />
        <SaveButton
          dirty={questionsDirty}
          saving={savingSection === "questions"}
          saved={savedSection === "questions"}
          error={sectionError?.key === "questions" ? sectionError.msg : null}
          onClick={saveQuestions}
        />
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Save as a preset</h3>
        <p className="mb-4 text-xs text-muted">
          Save this bot&apos;s configuration as a reusable preset (no keys or
          secrets are stored). Reuse it when creating a new bot.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={presetName}
            onChange={(e) => {
              setPresetName(e.target.value);
              setPresetStatus("idle");
            }}
            maxLength={80}
            placeholder="Preset name"
            className="min-w-[200px] flex-1 rounded-lg border border-border-base px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveAsPreset}
            disabled={presetStatus === "saving" || presetName.trim().length === 0}
            className="btn btn-secondary disabled:opacity-60"
          >
            {presetStatus === "saving" ? "Saving…" : "Save as preset"}
          </button>
          {presetStatus === "saved" ? (
            <span className="text-sm font-medium text-emerald-700">Saved!</span>
          ) : null}
          {presetStatus === "error" ? (
            <span className="text-sm font-medium text-rose-700">
              Couldn&apos;t save
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold text-rose-600">Danger zone</h3>
        <p className="mb-4 text-xs text-muted">
          Permanently deletes this bot, its knowledge base, conversations,
          leads, and any stored encrypted key. You can create a new bot
          afterwards. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn border border-rose-200 !bg-rose-50 !text-rose-600 hover:!bg-rose-100"
        >
          Delete this bot
        </button>
      </section>

      <DeleteBotModal
        botName={initialName}
        open={deleteOpen}
        busy={deleting}
        error={deleteError}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteBot}
      />
    </div>
  );
}

// Subtle, per-section save control. Right-aligned below a section's fields,
// enabled only when that section has unsaved edits. Shows a brief "Saved"
// confirmation and an inline error for its own section.
function SaveButton({
  dirty,
  saving,
  saved,
  error,
  onClick,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onClick: () => void;
}) {
  return (
    <div className="mt-5 border-t border-border-base pt-4">
      {error ? (
        <p role="alert" className="mb-2 text-right text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {saved ? (
          <span className="text-xs font-medium text-emerald-700">Saved</span>
        ) : null}
        <button
          type="button"
          onClick={onClick}
          disabled={!dirty || saving}
          className="rounded-lg border border-border-base px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder?: string;
}) {
  // `useId` gives us a stable, unique id per LabeledInput instance so the
  // `<label htmlFor>` and `<input id>` pair correctly under React Strict
  // Mode + SSR. Without this pairing, screen readers and testing-library
  // queries (`getByLabelText`) can't associate the two.
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

function RateLimitField({
  label,
  placeholderDefault,
  value,
  onChange,
  max,
}: {
  label: string;
  placeholderDefault: number;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`default ${placeholderDefault.toLocaleString()}`}
        className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <p className="mt-1 text-[11px] text-muted">
        Max {max.toLocaleString()}
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-block h-6 w-10 rounded-full transition-colors ${
        checked ? "bg-success" : "bg-neutral-200"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

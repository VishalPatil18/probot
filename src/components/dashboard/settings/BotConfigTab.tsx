"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import type { Personality } from "@/lib/bots/schemas";
import {
  CUSTOM_INSTRUCTIONS_MAX,
  PERSONALITY_PRESETS,
} from "@/lib/bots/schemas";

import { AvatarUploader } from "./AvatarUploader";
import { LabeledInput } from "./fields/LabeledInput";
import { SaveButton } from "./fields/SaveButton";
import { Toggle } from "./fields/Toggle";
import { ThemeColorField } from "./ThemeColorField";

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
  previewToken: string | null;
};

type SectionKey = "identity" | "personality" | "questions";

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

function ProBotMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="14" cy="20" r="3.4" fill="#fff" />
      <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
    </svg>
  );
}

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
  previewToken,
}: Props) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialIsActive);
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
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null);
  const [sectionError, setSectionError] = useState<{
    key: SectionKey;
    msg: string;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (savedSection === null) return;
    const t = setTimeout(() => setSavedSection(null), 1500);
    return () => clearTimeout(t);
  }, [savedSection]);

  const identityDirty =
    name !== initialName || headline !== initialHeadline;
  const personalityDirty =
    personality !== initialPersonality ||
    customInstructions !== initialCustomInstructions ||
    themeColor !== initialThemeColor;
  const questionsDirty = !arraysEqual(
    suggestedQuestions,
    initialSuggestedQuestions,
  );

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

  function saveQuestions() {
    if (!questionsDirty || savingSection) return;
    void commit("questions", { suggestedQuestions });
  }

  async function handleToggleStatus(next: boolean) {
    if (statusSaving) return;
    const prev = isActive;
    setIsActive(next);
    setStatusSaving(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        setIsActive(prev);
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
    </div>
  );
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

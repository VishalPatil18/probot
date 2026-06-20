"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";

import { ComingSoonPill } from "../ComingSoonPill";
import { SuggestedQuestionsEditor } from "../SuggestedQuestionsEditor";

type Props = {
  botId: string;
  initialName: string;
  initialHeadline: string;
  initialPersonality: Personality;
  initialSuggestedQuestions: string[];
  initialIsActive: boolean;
  initialThemeColor: string;
};

type Status = "idle" | "saving" | "saved" | "error";

const PERSONALITY_CARDS: Record<
  Personality,
  { title: string; icon: ReactNode }
> = {
  professional: {
    title: "Professional",
    icon: (
      <path d="M16 11V7a4 4 0 0 0-8 0v4M8 11h8M5 11h14l-1 9H6l-1-9z" />
    ),
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

const THEME_PRESETS = [
  "#7c5cff",
  "#10a37f",
  "#9b5cff",
  "#404040",
];

// Slice B — Bot Configuration tab. Single PATCH per save, diffed against
// initial values so only changed fields are sent. Status toggle uses
// the slice-B isActive widening; theme color preset swatches replace
// the slice-5 dedicated <ThemeColorPicker> component for visual parity
// with design/settings.html. Custom instructions are a future field
// (no schema column yet) so the textarea is Coming Soon.
export function BotConfigTab({
  botId,
  initialName,
  initialHeadline,
  initialPersonality,
  initialSuggestedQuestions,
  initialIsActive,
  initialThemeColor,
}: Props) {
  const router = useRouter();
  // State seeded from props once; subsequent prop changes do NOT clobber
  // user edits (same pattern as slice-6.5 BotSettingsForm).
  const [isActive, setIsActive] = useState(initialIsActive);
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [personality, setPersonality] =
    useState<Personality>(initialPersonality);
  const [suggestedQuestions, setSuggestedQuestions] = useState(
    initialSuggestedQuestions,
  );
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  const dirty =
    name !== initialName ||
    headline !== initialHeadline ||
    personality !== initialPersonality ||
    isActive !== initialIsActive ||
    themeColor !== initialThemeColor ||
    !arraysEqual(suggestedQuestions, initialSuggestedQuestions);

  async function handleSave() {
    if (!dirty || status === "saving") return;
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setStatus("error");
      setErrorMsg("Bot name is required.");
      return;
    }
    setStatus("saving");
    setErrorMsg(null);

    const patch: Record<string, unknown> = {};
    if (trimmedName !== initialName) patch.name = trimmedName;
    if (headline !== initialHeadline) patch.headline = headline;
    if (personality !== initialPersonality) patch.personality = personality;
    if (isActive !== initialIsActive) patch.isActive = isActive;
    if (themeColor !== initialThemeColor) patch.themeColor = themeColor;
    if (!arraysEqual(suggestedQuestions, initialSuggestedQuestions)) {
      patch.suggestedQuestions = suggestedQuestions;
    }

    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Couldn't save changes. Please try again.");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold">Bot status</h3>
          <label className="flex items-center gap-2 text-sm">
            <span className={isActive ? "text-success" : "text-muted"}>
              {isActive ? "Live" : "Off"}
            </span>
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              ariaLabel="Bot status"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
            Custom instructions{" "}
            <span className="font-normal text-muted">· max 2000 chars</span>
            <ComingSoonPill />
          </label>
          <textarea
            rows={3}
            disabled
            placeholder="Always be honest about what's in my data; if unsure, point recruiters to email me directly."
            className="thin-scroll w-full cursor-not-allowed resize-none rounded-xl border border-border-base bg-neutral-50 px-3 py-2.5 text-sm opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold">Theme color</label>
          <div className="flex items-center gap-2">
            {THEME_PRESETS.map((hex) => {
              const on = themeColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setThemeColor(hex)}
                  aria-label={`Theme color ${hex}`}
                  aria-pressed={on}
                  className={`size-8 rounded-full transition-shadow ${
                    on ? "ring-2 ring-brand ring-offset-2" : ""
                  }`}
                  style={{ background: hex }}
                />
              );
            })}
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              aria-label="Custom theme color"
              className="ml-2 size-8 cursor-pointer rounded-full border-0 bg-transparent"
            />
          </div>
        </div>
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
      </section>

      {status === "error" && errorMsg ? (
        <p role="alert" className="text-sm text-rose-700">
          {errorMsg}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {status === "saved" ? (
          <span className="text-sm font-medium text-emerald-700">Saved!</span>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || status === "saving"}
          className="btn btn-primary disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save bot settings"}
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
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <input
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

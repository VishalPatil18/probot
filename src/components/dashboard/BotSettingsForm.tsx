"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";

import { SuggestedQuestionsEditor } from "./SuggestedQuestionsEditor";

type Props = {
  botId: string;
  initialName: string;
  initialHeadline: string;
  initialPersonality: Personality;
  initialSuggestedQuestions: string[];
};

type Status = "idle" | "saving" | "saved" | "error";

const PERSONALITY_CARDS: Record<
  Personality,
  { title: string; tagline: string }
> = {
  professional: { title: "Professional", tagline: "Clear & concise" },
  creative: { title: "Creative", tagline: "Warm & expressive" },
  enthusiastic: { title: "Enthusiastic", tagline: "High energy" },
};

// Stage 6 §6.5: dashboard settings form for the four editable identity
// fields. Whole-form Save (per Q7 of slice-6.5 prep): one PATCH per click,
// diffed against the initial values so we only send fields that changed.
// "Saved!" indicator clears after 1.5s.
//
// Mass-assignment safety lives on the server side via `botPatchInput` —
// this component is the happy-path client; an attacker who bypasses the
// UI and hand-crafts a body cannot widen the field surface.
export function BotSettingsForm({
  botId,
  initialName,
  initialHeadline,
  initialPersonality,
  initialSuggestedQuestions,
}: Props) {
  const router = useRouter();
  // State is seeded from props once; we intentionally do NOT sync state
  // from changed initial* props mid-edit. Doing so would clobber the
  // user's in-flight typed values whenever the parent server-component
  // re-renders (e.g. after router.refresh fires post-save). The current
  // shape: state holds user input; props feed the dirty-diff comparison;
  // closing the page or hard-navigating re-mounts with fresh initials.
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [personality, setPersonality] = useState<Personality>(initialPersonality);
  const [suggestedQuestions, setSuggestedQuestions] = useState(
    initialSuggestedQuestions,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear the "Saved!" transient after 1.5s.
  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  const dirty =
    name !== initialName ||
    headline !== initialHeadline ||
    personality !== initialPersonality ||
    !arraysEqual(suggestedQuestions, initialSuggestedQuestions);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || status === "saving") return;
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setStatus("error");
      setErrorMsg("Name is required.");
      return;
    }
    setStatus("saving");
    setErrorMsg(null);

    // Diff against initial values — only send fields that actually changed.
    // Saves DB write churn and makes the audit trail cleaner.
    const patch: Record<string, unknown> = {};
    if (trimmedName !== initialName) patch.name = trimmedName;
    if (headline !== initialHeadline) patch.headline = headline;
    if (personality !== initialPersonality) patch.personality = personality;
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
      // Refresh the server component so the new initial values flow back.
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="bot-name"
          className="block text-sm font-semibold text-text-base"
        >
          Name
        </label>
        <input
          id="bot-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-xl border border-border-base bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label
          htmlFor="bot-headline"
          className="block text-sm font-semibold text-text-base"
        >
          Headline
        </label>
        <input
          id="bot-headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          placeholder="e.g. ML Engineer · San Francisco"
          className="mt-1 w-full rounded-xl border border-border-base bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-text-base">
          Personality
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PERSONALITY_PRESETS.map((preset) => {
            const card = PERSONALITY_CARDS[preset];
            const checked = personality === preset;
            return (
              <label
                key={preset}
                className={`block cursor-pointer rounded-2xl border p-3 text-sm shadow-sm transition ${
                  checked
                    ? "border-brand bg-brand/5"
                    : "border-border-base bg-white hover:border-brand/40"
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
                <p className="font-semibold text-text-base">{card.title}</p>
                <p className="mt-0.5 text-xs text-muted">{card.tagline}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="text-sm font-semibold text-text-base">
          Suggested questions
        </p>
        <p className="mt-1 text-xs text-muted">
          These appear under the chat intro to help recruiters get started.
        </p>
        <div className="mt-2">
          <SuggestedQuestionsEditor
            value={suggestedQuestions}
            onChange={setSuggestedQuestions}
          />
        </div>
      </div>

      {status === "error" && errorMsg ? (
        <p role="alert" className="text-sm text-rose-700">
          {errorMsg}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || status === "saving"}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" ? (
          <span className="text-sm font-medium text-emerald-700">Saved!</span>
        ) : null}
      </div>
    </form>
  );
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

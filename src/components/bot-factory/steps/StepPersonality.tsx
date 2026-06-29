"use client";

import { ThemeColorField } from "@/components/dashboard/settings/ThemeColorField";
import {
  CUSTOM_INSTRUCTIONS_MAX,
  PERSONALITY_PRESETS,
} from "@/lib/bots/schemas";

import { PERSONALITY_LABELS } from "../constants";
import { StepHeading } from "../parts/StepHeading";
import type { FormState, PatchFn } from "../types";

export function StepPersonality({
  form,
  patch,
  newQuestion,
  setNewQuestion,
  addQuestion,
  removeQuestion,
}: {
  form: FormState;
  patch: PatchFn;
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

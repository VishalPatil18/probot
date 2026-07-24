"use client";

import { useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

const MAX_QUESTIONS = 6;
const MAX_CHARS = 200;

export function SuggestedQuestionsEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    if (trimmed.length > MAX_CHARS) return;
    if (value.length >= MAX_QUESTIONS) return;
    if (value.includes(trimmed)) {
      setHint("Already in the list.");
      setDraft("");
      return;
    }
    setHint(null);
    onChange([...value, trimmed]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  }

  const atCap = value.length >= MAX_QUESTIONS;

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((q, idx) => (
            <li
              key={q}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-base bg-white px-3 py-1 text-xs"
            >
              <span className="max-w-xs truncate">{q}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`Remove "${q}"`}
                className="text-muted hover:text-rose-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            atCap ? `Max ${MAX_QUESTIONS} questions reached` : "Add a question…"
          }
          disabled={atCap}
          maxLength={MAX_CHARS}
          className="flex-1 rounded-xl border border-border-base bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={commit}
          disabled={atCap || draft.trim().length === 0}
          className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {value.length} of {MAX_QUESTIONS} questions
        {hint ? (
          <span className="ml-2 text-amber-700" role="status">
            {hint}
          </span>
        ) : null}
      </p>
    </div>
  );
}

"use client";

import { useId } from "react";

export function LabeledInput({
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

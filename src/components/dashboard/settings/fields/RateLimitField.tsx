"use client";

import { useId } from "react";

export function RateLimitField({
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

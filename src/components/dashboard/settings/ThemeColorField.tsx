"use client";

import { useEffect, useRef, useState } from "react";

const THEME_PRESETS = ["#7c5cff", "#10a37f", "#9b5cff", "#404040"];

interface ThemeColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
}

// Theme color control: a single colored circle showing the current color.
// Clicking it opens a popover with the preset swatch grid + a native color
// input for a fully custom hex. Replaces the always-visible swatch row so the
// Bot configuration form stays compact. Closes on outside click or Escape.
export function ThemeColorField({ value, onChange }: ThemeColorFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Theme color"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-border-base bg-white py-2 pl-2 pr-3"
      >
        <span
          className="size-7 rounded-full border border-border-base"
          style={{ background: value }}
        />
        <span className="font-mono text-sm">{value}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose theme color"
          className="absolute z-20 mt-2 w-56 rounded-xl border border-border-base bg-white p-3 shadow-lg"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Presets
          </p>
          <div className="mb-3 flex items-center gap-2">
            {THEME_PRESETS.map((hex) => {
              const on = value.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onChange(hex)}
                  aria-label={`Theme color ${hex}`}
                  aria-pressed={on}
                  className={`size-8 rounded-full transition-shadow ${
                    on ? "ring-2 ring-brand ring-offset-2" : ""
                  }`}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            Custom
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              aria-label="Custom theme color"
              className="size-8 cursor-pointer rounded-lg border border-border-base bg-transparent"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

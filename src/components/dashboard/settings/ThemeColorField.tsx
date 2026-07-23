"use client";

const THEME_PRESETS = ["#0070dd", "#ef4444", "#16a34a", "#000000"];

interface ThemeColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ThemeColorField({ value, onChange }: ThemeColorFieldProps) {
  const isPreset = THEME_PRESETS.some(
    (hex) => hex.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div className="flex items-center gap-2">
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

      <label
        aria-label="Custom theme color"
        title="Custom color"
        className={`relative grid size-8 cursor-pointer place-items-center rounded-full border border-border-base transition-shadow ${
          !isPreset ? "ring-2 ring-brand ring-offset-2" : ""
        }`}
        style={{ background: value }}
      >
        <span className="mix-blend-difference text-white">
          <ColorPickerIcon />
        </span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Custom theme color picker"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function ColorPickerIcon() {
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
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  );
}

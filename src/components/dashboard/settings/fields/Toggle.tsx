"use client";

export function Toggle({
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

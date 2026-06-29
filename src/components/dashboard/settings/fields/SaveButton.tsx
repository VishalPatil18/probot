"use client";

// Per-section save control: enabled only when that section has unsaved edits.
// Shows a brief "Saved" confirmation and an inline error for its own section.
export function SaveButton({
  dirty,
  saving,
  saved,
  error,
  onClick,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onClick: () => void;
}) {
  return (
    <div className="mt-5 border-t border-border-base pt-4">
      {error ? (
        <p role="alert" className="mb-2 text-right text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {saved ? (
          <span className="text-xs font-medium text-emerald-700">Saved</span>
        ) : null}
        <button
          type="button"
          onClick={onClick}
          disabled={!dirty || saving}
          className="rounded-lg border border-border-base px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

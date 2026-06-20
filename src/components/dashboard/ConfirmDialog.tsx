"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Stage 6 §6.7: design-system styled confirmation modal — replaces the
// browser-native `window.confirm` so destructive actions (delete a
// knowledge source, etc.) match the rest of the dashboard. ESC + outside-
// click both fire `onCancel`. The confirm button auto-focuses for keyboard
// flow.
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        // Fire cancel only when both press and release happen on the
        // backdrop (the click event requires this by spec). Using
        // `mousedown` instead would close the dialog if a user
        // accidentally drag-released from inside the panel onto the
        // backdrop — a real usability hazard.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-base bg-white p-6 shadow-lg">
        <h2
          id="confirm-dialog-title"
          className="font-display text-lg font-semibold text-text-base"
        >
          {title}
        </h2>
        {body ? (
          <p className="mt-2 text-sm text-muted">{body}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border-base bg-white px-4 py-2 text-sm font-semibold text-text-base hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-brand hover:bg-brand/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

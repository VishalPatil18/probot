"use client";

import { useEffect, useId, useState } from "react";

const CONFIRM_PHRASE = "delete this bot";

interface Props {
  botName: string;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBotModal({
  botName,
  open,
  busy,
  error,
  onClose,
  onConfirm,
}: Props) {
  const nameId = useId();
  const phraseId = useId();
  const [typedName, setTypedName] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");

  useEffect(() => {
    if (open) {
      setTypedName("");
      setTypedPhrase("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const nameOk = typedName === botName;
  const phraseOk = typedPhrase.trim().toLowerCase() === CONFIRM_PHRASE;
  const enabled = nameOk && phraseOk && !busy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-bot-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-floating">
        <h2
          id="delete-bot-title"
          className="font-display text-xl font-extrabold text-rose-600"
        >
          Delete this bot
        </h2>
        <p className="mt-2 text-sm text-muted">
          The bot, its knowledge base, conversations, leads, and any stored
          managed key will be permanently deleted. You can create a new bot
          afterwards if you change your mind.{" "}
          <strong>This cannot be undone.</strong>
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor={nameId}
              className="mb-1.5 block text-xs font-semibold"
            >
              Type the bot&apos;s name{" "}
              <span className="font-mono text-muted">({botName})</span>
            </label>
            <input
              id={nameId}
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </div>
          <div>
            <label
              htmlFor={phraseId}
              className="mb-1.5 block text-xs font-semibold"
            >
              Type{" "}
              <span className="font-mono text-muted">
                &ldquo;{CONFIRM_PHRASE}&rdquo;
              </span>{" "}
              to confirm
            </label>
            <input
              id={phraseId}
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!enabled}
            className="btn border border-rose-200 !bg-rose-600 !text-white hover:!bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete bot"}
          </button>
        </div>
      </div>
    </div>
  );
}

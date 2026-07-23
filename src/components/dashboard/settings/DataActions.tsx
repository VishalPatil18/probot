"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  username: string;
}

export function DataActions({ username }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    bots: number;
    knowledge: number;
    conversations: number;
    messages: number;
    leads: number;
    notifications: number;
  } | null>(null);

  async function confirm() {
    if (typed.trim() !== username) {
      setError("Username didn't match. Type it exactly.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/purge-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: typed.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: typeof summary;
      };
      if (!res.ok) {
        setError(
          body.error === "username_mismatch"
            ? "Username didn't match. Type it exactly."
            : "Couldn't delete your data. Please try again.",
        );
        return;
      }
      setSummary(body.deleted ?? null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setTyped("");
    setError(null);
    setSummary(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Delete all my data</p>
          <p className="text-xs text-muted">
            Removes every bot, knowledge chunk, conversation, lead, and
            notification. Your account and profile stay. This cannot be
            undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="!py-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Delete all data
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete all data"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            {summary ? (
              <>
                <h3 className="font-display text-lg font-bold">Data wiped.</h3>
                <p className="mt-1 text-sm text-muted">
                  Removed {summary.bots}{" "}
                  {summary.bots === 1 ? "bot" : "bots"}, {summary.knowledge}{" "}
                  knowledge {summary.knowledge === 1 ? "chunk" : "chunks"},{" "}
                  {summary.conversations}{" "}
                  {summary.conversations === 1
                    ? "conversation"
                    : "conversations"}
                  , {summary.messages}{" "}
                  {summary.messages === 1 ? "message" : "messages"},{" "}
                  {summary.leads}{" "}
                  {summary.leads === 1 ? "lead" : "leads"}, and{" "}
                  {summary.notifications}{" "}
                  {summary.notifications === 1
                    ? "notification"
                    : "notifications"}
                  .
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="btn btn-primary"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-rose-700">
                  Delete all my data?
                </h3>
                <p className="mt-1 text-sm text-muted">
                  This removes every bot and everything that lives under it
                  (knowledge, conversations, messages, leads, tokens) plus
                  all notifications. Your account stays. This action cannot
                  be undone.
                </p>
                <label className="mt-4 block text-sm">
                  <span className="font-medium">
                    Type your username to confirm:{" "}
                    <code className="text-rose-700">{username}</code>
                  </span>
                  <input
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-border-base px-3 py-2"
                    placeholder={username}
                  />
                </label>
                {error ? (
                  <p role="alert" className="mt-2 text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={busy || typed.trim() !== username}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {busy ? "Deleting…" : "Delete all data"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

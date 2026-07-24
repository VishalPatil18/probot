"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteBotModal } from "../DeleteBotModal";

type Props = {
  botId: string;
  botName: string;
  botHeadline: string;
};

export function SelfHostedDangerZone({ botId, botName, botHeadline }: Props) {
  const router = useRouter();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteBot() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Couldn't delete this bot. Please try again.");
        return;
      }
      setDeleteOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="font-bold">{botName}</h3>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
            Self-hosted
          </span>
        </div>
        {botHeadline ? <p className="text-xs text-muted">{botHeadline}</p> : null}
        <p className="mt-3 text-xs text-muted">
          This bot runs on your own infrastructure. Its persona, knowledge, and
          API key live in your app - ProBot only stores the dashboard entry and
          its access tokens.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold text-rose-600">Danger zone</h3>
        <p className="mb-4 text-xs text-muted">
          Permanently deletes this bot&apos;s dashboard entry, its access
          tokens, and any conversations and leads recorded through the API. Your
          self-hosted runtime is unaffected. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn border border-rose-200 !bg-rose-50 !text-rose-600 hover:!bg-rose-100"
        >
          Delete this bot
        </button>
      </section>

      <DeleteBotModal
        botName={botName}
        open={deleteOpen}
        busy={deleting}
        error={deleteError}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteBot}
      />
    </div>
  );
}

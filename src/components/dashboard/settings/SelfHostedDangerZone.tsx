"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteBotModal } from "../DeleteBotModal";

type Props = {
  botId: string;
  botName: string;
};

export function SelfHostedDangerZone({ botId, botName }: Props) {
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
    <>
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
    </>
  );
}

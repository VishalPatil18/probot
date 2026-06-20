"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "./ConfirmDialog";

type SourceSummary = {
  name: string;
  sourceType: "pdf" | "text";
  chunkCount: number;
  tokenCount: number;
};

type Props = {
  botId: string;
};

type Status = "idle" | "loading" | "uploading" | "reprocessing" | "error";

const ACCEPTED = "application/pdf";

function fmtTokens(n: number): string {
  if (n < 1000) return `${n} tokens`;
  return `${(n / 1000).toFixed(1)}K tokens`;
}

// Stage 6 §6.7: dashboard knowledge management. Lists every source row,
// allows per-source delete (with a design-system ConfirmDialog), drag-and-
// drop or click-to-upload of new PDFs, and a "Reprocess All" button that
// re-assembles `bots.context_text` from the current `knowledge_base` rows.
//
// All four endpoints already exist from Stage 2 — this component is the
// dashboard surface that finally exercises them outside the Bot Factory
// wizard.
export function KnowledgeManager({ botId }: Props) {
  const [sources, setSources] = useState<SourceSummary[] | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge`);
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Couldn't load knowledge sources.");
        return;
      }
      const body = (await res.json()) as { sources: SourceSummary[] };
      setSources(body.sources);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg("Network error loading sources.");
    }
  }, [botId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUpload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type === ACCEPTED);
    if (list.length === 0) {
      setErrorMsg("Only PDF files are supported.");
      return;
    }
    setStatus("uploading");
    setErrorMsg(null);
    setHint(null);
    const form = new FormData();
    for (const f of list) form.append("files", f);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Couldn't upload. Please try again.");
        return;
      }
      setHint(`Uploaded ${list.length} file${list.length === 1 ? "" : "s"}.`);
      await refresh();
    } catch {
      setStatus("error");
      setErrorMsg("Network error during upload.");
    }
  }

  async function handleDelete(sourceName: string) {
    setPendingDelete(null);
    try {
      const res = await fetch(
        `/api/bots/${botId}/knowledge/sources/${encodeURIComponent(sourceName)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(`Couldn't delete "${sourceName}".`);
        return;
      }
      setHint(`Deleted "${sourceName}".`);
      await refresh();
    } catch {
      setStatus("error");
      setErrorMsg("Network error during delete.");
    }
  }

  async function handleReprocess() {
    setStatus("reprocessing");
    setErrorMsg(null);
    setHint(null);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge/reprocess`, {
        method: "POST",
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Reprocess failed. Please try again.");
        return;
      }
      const body = (await res.json()) as { totalTokens?: number };
      setHint(
        body.totalTokens !== undefined
          ? `Reprocessed (${body.totalTokens.toLocaleString()} tokens).`
          : "Reprocessed.",
      );
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg("Network error during reprocess.");
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      // Capture the FileList reference BEFORE clearing the input.
      // `handleUpload` reads `files` synchronously via `Array.from`, so the
      // reset on the next line is safe — but ordering matters; do not
      // swap these lines. Programmatic `value = ""` does NOT trigger a
      // second `change` event in any browser.
      void handleUpload(e.target.files);
    }
    // Reset so the same file can be re-uploaded if needed.
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleUpload(e.dataTransfer.files);
    }
  }

  return (
    <div>
      {sources === null ? (
        <p className="text-sm text-muted">Loading knowledge sources…</p>
      ) : sources.length === 0 ? (
        <p className="mb-4 rounded-2xl border border-dashed border-border-base bg-white p-6 text-center text-sm text-muted">
          No knowledge sources yet. Upload a PDF below to get started.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {sources.map((src) => (
            <li
              key={src.name}
              className="flex items-center justify-between rounded-2xl border border-border-base bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{src.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {src.sourceType.toUpperCase()} · {src.chunkCount} chunks ·{" "}
                  {fmtTokens(src.tokenCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(src.name)}
                aria-label={`Delete "${src.name}"`}
                className="ml-3 rounded-xl border border-border-base bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor="kb-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border-base bg-white hover:border-brand/40"
        }`}
      >
        <input
          id="kb-upload"
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="sr-only"
        />
        <p className="text-sm font-semibold text-text-base">
          {status === "uploading"
            ? "Uploading…"
            : dragOver
              ? "Drop to upload"
              : "Drop PDFs here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-muted">
          PDF only · up to 5 files · 10 MB each
        </p>
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReprocess}
          disabled={status === "reprocessing" || status === "uploading"}
          className="rounded-xl border border-border-base bg-white px-3 py-2 text-sm font-semibold text-text-base hover:bg-gray-50 disabled:opacity-60"
        >
          {status === "reprocessing" ? "Reprocessing…" : "Reprocess all"}
        </button>
        {hint ? (
          <p className="text-xs text-emerald-700">{hint}</p>
        ) : errorMsg ? (
          <p role="alert" className="text-xs text-rose-700">
            {errorMsg}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete ?? ""}"?`}
        body="This removes the source from this bot's knowledge base. You can re-upload later."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

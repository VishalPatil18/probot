"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "../ConfirmDialog";

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

// Knowledge base tab. Same wiring as the earlier KnowledgeManager
// (the underlying /knowledge endpoints don't change) but visual layout
// matches design/settings.html: source rows with type-icon + filename +
// "N chunks · indexed" caption + small icon-only delete, "Re-index all"
// button in the section header, and a full-width dashed "Add source"
// upload zone at the bottom.
export function KnowledgeTab({ botId }: Props) {
  const [sources, setSources] = useState<SourceSummary[] | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const list = Array.from(files).filter((f) => f.type === "application/pdf");
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

  async function handleReindex() {
    setStatus("reprocessing");
    setErrorMsg(null);
    setHint(null);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge/reprocess`, {
        method: "POST",
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Re-index failed. Please try again.");
        return;
      }
      const body = (await res.json()) as { totalTokens?: number };
      setHint(
        body.totalTokens !== undefined
          ? `Re-indexed (${body.totalTokens.toLocaleString()} tokens).`
          : "Re-indexed.",
      );
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg("Network error during re-index.");
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      // Capture FileList ref before clearing; same ordering note as in
      // the slice-6.5 KnowledgeManager.
      void handleUpload(e.target.files);
    }
    e.target.value = "";
  }

  const totalChunks = sources?.reduce((sum, s) => sum + s.chunkCount, 0) ?? 0;

  return (
    <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-bold">Knowledge base</h3>
        <button
          type="button"
          onClick={handleReindex}
          disabled={status === "reprocessing" || status === "uploading"}
          className="btn btn-secondary !py-2 text-xs disabled:opacity-60"
        >
          {status === "reprocessing" ? "Re-indexing…" : "Re-index all"}
        </button>
      </div>
      <p className="mb-5 text-xs text-muted">
        {sources === null
          ? "Loading…"
          : sources.length === 0
            ? "No sources yet."
            : `${sources.length} source${sources.length === 1 ? "" : "s"} · ${totalChunks} chunk${totalChunks === 1 ? "" : "s"} indexed for top-3 retrieval.`}
      </p>

      {sources && sources.length > 0 ? (
        <ul className="space-y-2">
          {sources.map((src) => (
            <li
              key={src.name}
              className="flex items-center gap-3 rounded-xl border border-border-base p-3"
            >
              <SourceIcon type={src.sourceType} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{src.name}</p>
                <p className="text-[11px] text-success">
                  {src.chunkCount} chunk{src.chunkCount === 1 ? "" : "s"} ·
                  indexed
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(src.name)}
                aria-label={`Delete "${src.name}"`}
                className="text-muted hover:text-rose-600"
              >
                <svg
                  aria-hidden
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label
        htmlFor="kb-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void handleUpload(e.dataTransfer.files);
          }
        }}
        className={`mt-4 block w-full cursor-pointer rounded-xl border-2 border-dashed py-4 text-center text-sm font-semibold transition-colors ${
          dragOver
            ? "border-brand bg-blue-50/50 text-brand"
            : "border-border-base text-muted hover:border-brand hover:text-brand"
        }`}
      >
        <input
          id="kb-upload"
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="sr-only"
        />
        <span className="mr-1 align-middle">＋</span>
        {status === "uploading"
          ? "Uploading…"
          : dragOver
            ? "Drop to upload"
            : "Add source"}
      </label>

      <div className="mt-3 min-h-[1rem] text-xs">
        {hint ? (
          <p className="text-emerald-700">{hint}</p>
        ) : errorMsg ? (
          <p role="alert" className="text-rose-700">
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
    </section>
  );
}

function SourceIcon({ type }: { type: "pdf" | "text" }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand">
      {type === "pdf" ? (
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      ) : (
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="14" y2="17" />
        </svg>
      )}
    </span>
  );
}

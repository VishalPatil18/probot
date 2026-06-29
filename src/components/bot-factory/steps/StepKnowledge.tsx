"use client";

import { useState } from "react";

import {
  CONTEXT_TOKEN_CAP_DEFAULT,
  CONTEXT_TOKEN_CAP_MAX,
  CONTEXT_TOKEN_CAP_MIN,
} from "@/lib/bots/schemas";
import {
  MAX_PDF_BYTES,
  MAX_PDF_FILES,
  PDF_MIME_TYPE,
} from "@/lib/ingestion/constants";

import { StepHeading } from "../parts/StepHeading";
import { TrashIcon } from "../parts/TrashIcon";
import type { FormState, PatchFn } from "../types";

export function StepKnowledge({
  form,
  patch,
}: {
  form: FormState;
  patch: PatchFn;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function addFiles(incoming: FileList | File[]): void {
    setFileError(null);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(incoming)) {
      const isPdf =
        file.type === PDF_MIME_TYPE || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        rejected.push(`${file.name}: not a PDF`);
        continue;
      }
      if (file.size > MAX_PDF_BYTES) {
        rejected.push(
          `${file.name}: exceeds ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)}MB`,
        );
        continue;
      }
      accepted.push(file);
    }
    const merged = [...form.pdfFiles];
    for (const file of accepted) {
      if (merged.length >= MAX_PDF_FILES) {
        rejected.push(`${file.name}: max ${MAX_PDF_FILES} files`);
        continue;
      }
      // Dedupe by filename: replacing earlier add keeps the latest content.
      const without = merged.filter((f) => f.name !== file.name);
      merged.length = 0;
      merged.push(...without, file);
    }
    patch("pdfFiles", merged);
    if (rejected.length > 0) setFileError(rejected.join("; "));
  }

  function removeFile(name: string): void {
    patch(
      "pdfFiles",
      form.pdfFiles.filter((f) => f.name !== name),
    );
  }

  return (
    <section>
      <StepHeading
        step={2}
        title="Feed it your career."
        subtitle="Upload a PDF, paste text, or both. Recruiters' questions get answered from this."
      />
      <div className="space-y-5">
        <div>
          <label
            htmlFor="bf-pdf-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
            }}
            className={`block rounded-2xl p-6 text-center border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-brand bg-brand/5"
                : "border-border-base bg-neutral-50 hover:border-brand/50"
            }`}
          >
            <p className="text-sm font-semibold">
              Drop a PDF here or click to upload
            </p>
            <p className="text-xs text-muted mt-1">
              Resume, LinkedIn profile export, or any PDF with your career info.
              Max {MAX_PDF_FILES} files, {MAX_PDF_BYTES / 1024 / 1024}MB each.
            </p>
            <input
              id="bf-pdf-input"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {form.pdfFiles.length > 0 && (
            <ul className="mt-3 space-y-2">
              {form.pdfFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-3 text-sm border border-border-base rounded-xl px-3 py-2"
                >
                  <span className="truncate">
                    {file.name}{" "}
                    <span className="text-muted text-xs">
                      · {(file.size / 1024).toFixed(0)}KB
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="shrink-0 text-red-600 transition-colors hover:text-red-700"
                    aria-label={`Remove ${file.name}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {fileError && (
            <p role="alert" className="mt-2 text-xs text-error">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="bf-ctx"
            className="block text-xs font-semibold mb-1.5"
          >
            Bio / resume text{" "}
            <span className="text-muted font-normal">· max 50,000 chars</span>
          </label>
          <textarea
            id="bf-ctx"
            rows={8}
            value={form.contextText}
            onChange={(e) => patch("contextText", e.target.value)}
            maxLength={50_000}
            placeholder="Paste a bio, key wins, projects, or anything recruiters should know…"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand resize-none"
          />
          <p className="text-[11px] text-muted mt-1.5">
            {form.contextText.length.toLocaleString()} / 50,000
          </p>
        </div>

        <div className="border-t border-border-base pt-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-expanded={advancedOpen}
            className="text-xs font-semibold text-muted hover:text-text-base"
          >
            {advancedOpen ? "▾" : "▸"} Advanced
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-2">
              <label
                htmlFor="bf-token-cap"
                className="block text-xs font-semibold"
              >
                Context token cap
              </label>
              <input
                id="bf-token-cap"
                type="number"
                min={CONTEXT_TOKEN_CAP_MIN}
                max={CONTEXT_TOKEN_CAP_MAX}
                step={1000}
                value={form.contextTokenCap}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(n)) return;
                  const clamped = Math.max(
                    CONTEXT_TOKEN_CAP_MIN,
                    Math.min(CONTEXT_TOKEN_CAP_MAX, n),
                  );
                  patch("contextTokenCap", clamped);
                }}
                className="w-32 py-2 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
              />
              <p className="text-[11px] text-muted">
                Higher values let the bot reference more of your knowledge but
                risk exceeding your LLM's context window - smaller models
                (Haiku, gpt-4o-mini) may refuse responses above ~12K. Default{" "}
                {CONTEXT_TOKEN_CAP_DEFAULT.toLocaleString()}.
              </p>

              <label
                htmlFor="bf-embedding-key"
                className="block text-xs font-semibold pt-3"
              >
                OpenAI key for semantic search (optional)
              </label>
              <input
                id="bf-embedding-key"
                type="password"
                autoComplete="off"
                placeholder="sk-..."
                value={form.embeddingApiKey}
                onChange={(e) => patch("embeddingApiKey", e.target.value)}
                className="w-full py-2 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
              />
              <p className="text-[11px] text-muted">
                When provided, your knowledge is embedded with OpenAI and the
                bot uses semantic search at chat time for more accurate answers.
                Stored in your browser only, never on our servers. Leave blank
                to use full-context (default).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

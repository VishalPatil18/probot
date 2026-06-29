"use client";

import { CopyUrlButton } from "@/components/dashboard/CopyUrlButton";

import { StepHeading } from "../parts/StepHeading";

export function StepDeploy({
  username,
  createdBotId,
  previewToken,
  published,
  publishing,
  onPublish,
}: {
  username: string;
  createdBotId: string | null;
  previewToken: string | null;
  published: boolean;
  publishing: boolean;
  onPublish: () => void;
}) {
  // Build the real public URL from the current origin so localhost
  // dev, preview deploys, and prod all show the right share link.
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://pro-bot.dev";
  const publicUrl = `${origin}/u/${username}/chat`;
  const previewUrl = previewToken
    ? `${publicUrl}?preview=${encodeURIComponent(previewToken)}`
    : null;
  return (
    <section>
      <StepHeading
        step={5}
        title={published ? "Bot is live 🚀" : "Preview before you publish"}
        subtitle={
          published
            ? "Your bot is published and the public link is live."
            : "Try your bot privately. Recruiters can't reach the public URL until you publish."
        }
      />
      <div className="space-y-5">
        {createdBotId && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              published
                ? "bg-success/10 border-success/20"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <span aria-hidden>{published ? "✓" : "✎"}</span>
            <div>
              <p className="text-sm font-bold">
                {published ? "Bot published" : "Bot saved as draft"}
              </p>
              <p className="text-xs text-muted">
                {published
                  ? "Anyone with the link below can chat with your bot."
                  : "Publishing flips the public link on. You can republish or unpublish anytime from settings."}
              </p>
            </div>
          </div>
        )}

        {!published && previewUrl ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Private preview link
            </label>
            <div className="flex items-center gap-2 mt-1.5 border border-amber-200 rounded-xl px-3 py-2.5 bg-amber-50">
              <span className="text-sm font-mono flex-1 truncate">
                {previewUrl}
              </span>
              <CopyUrlButton url={previewUrl} />
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Token-signed; only people you share this link with can chat with
              the draft.
            </p>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="btn btn-primary mt-4 disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish bot"}
            </button>
          </div>
        ) : null}

        {published ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Your bot link
            </label>
            <div className="flex items-center gap-2 mt-1.5 border border-border-base rounded-xl px-3 py-2.5 bg-white">
              <span className="text-sm font-mono flex-1 truncate">
                {publicUrl}
              </span>
              <CopyUrlButton url={publicUrl} />
            </div>
          </div>
        ) : null}

        {createdBotId ? (
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Embed code
            </label>
            <div className="mt-1.5 rounded-xl border border-border-base bg-neutral-900 p-3.5 ring-1 ring-white/10">
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-neutral-100">
                  <code>{`<script src="${origin}/widget.js" data-bot-id="${createdBotId}"></script>`}</code>
                </pre>
                <CopyUrlButton
                  url={`<script src="${origin}/widget.js" data-bot-id="${createdBotId}"></script>`}
                  label="Copy embed"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Paste before the closing <code>&lt;/body&gt;</code> tag on your site
              to drop in a floating chat bubble pre-configured with your bot.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-4 border border-border-base bg-neutral-50 opacity-60">
            <p className="text-sm font-semibold">Embed code</p>
            <p className="text-xs text-muted mt-1">
              Save your bot to generate the embed snippet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

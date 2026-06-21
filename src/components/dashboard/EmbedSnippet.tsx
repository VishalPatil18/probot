"use client";

import { CopyUrlButton } from "./CopyUrlButton";

// Stage 5: Embed surface shown on the bot detail page. Three copyable
// snippets - public chat URL, <script> tag for embedding the widget, and
// a hand-rolled HTML signature badge for email clients.
//
// All snippets are static text - copy uses the existing CopyUrlButton
// component (which wraps navigator.clipboard). The labels distinguish
// the three buttons so the feedback toast is unambiguous.

type Props = {
  botId: string;
  username: string;
  themeColor: string;
  origin: string;
};

export function EmbedSnippet({ botId, username, themeColor, origin }: Props) {
  const chatUrl = `${origin}/u/${username}/chat`;
  const scriptTag = `<script src="${origin}/widget.js" data-bot-id="${botId}"></script>`;
  const signatureHtml = signatureBadgeHtml({ username, themeColor, origin });

  return (
    <div className="space-y-6">
      <SnippetCard
        label="Public URL"
        description="Direct link to your bot's chat page. Share anywhere."
        snippet={chatUrl}
        copyLabel="Copy URL"
      />
      <SnippetCard
        label="Website embed"
        description={`Paste this before the closing </body> tag on your site.`}
        snippet={scriptTag}
        copyLabel="Copy embed"
      />
      <SnippetCard
        label="Email signature"
        description="Paste the HTML into your Gmail / Apple Mail signature settings."
        snippet={signatureHtml}
        copyLabel="Copy signature"
      />
    </div>
  );
}

function SnippetCard({
  label,
  description,
  snippet,
  copyLabel,
}: {
  label: string;
  description: string;
  snippet: string;
  copyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border-base bg-white p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <CopyUrlButton url={snippet} label={copyLabel} />
      </div>
      <p className="mb-3 text-xs text-muted">{description}</p>
      <pre className="overflow-x-auto rounded-xl border border-border-base bg-neutral-50 px-3 py-2 font-mono text-xs leading-relaxed">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

// Email-signature template. Hand-rolled HTML rather than a React render
// because Gmail / Apple Mail / Outlook each have a different sanitizer
// - only inline styles + anchor tags survive everywhere. The emoji is
// a U+1F4AC speech-balloon (renders consistently across mail clients).
export function signatureBadgeHtml(args: {
  username: string;
  themeColor: string;
  origin: string;
}): string {
  const { username, themeColor, origin } = args;
  const url = `${origin}/u/${username}/chat`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:${themeColor};text-decoration:none;font-weight:600;font-family:Arial,sans-serif;font-size:13px;">💬 Chat with my AI · ${origin.replace(/^https?:\/\//, "")}/u/${username}</a>`;
}

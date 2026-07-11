import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { reportLead } from "./adapters/dashboard";
import { useProbotChat } from "./hooks/useProbotChat";
import type { ChatMessage, ProbotBotConfig } from "./types";
import widgetCss from "./widget.css";

const DEFAULT_THEME = "#2563eb";

// Drop-in React chat widget. Mirrors the DOM + class shape of the ProBot
// managed embed widget (see `src/widget/widget.ts` in the probot repo) so
// the visual language is identical across managed and self-hosted bots.
// The full stylesheet ships inline via a bundled `<style>` tag; class names
// are all `probot-*` prefixed so host-page collisions are unlikely.
export function ProbotBot(config: ProbotBotConfig) {
  const [open, setOpen] = useState(false);
  const [suggestListOpen, setSuggestListOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSent, setLeadSent] = useState(false);

  const chat = useProbotChat(config);
  const theme = config.themeColor ?? DEFAULT_THEME;
  const themedRoot: CSSProperties = {
    ["--probot-theme" as string]: theme,
  };
  const suggestions = config.suggestedQuestions ?? [];
  const hasSuggestions = suggestions.length > 0;
  const showInlineChips = hasSuggestions && chat.messages.length === 0;
  const showSuggestToggle = hasSuggestions && chat.messages.length > 0;

  const messagesRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.busy]);

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const email = leadEmail.trim();
    if (!email) return;
    let ok = true;
    if (config.dashboard) {
      ok = await reportLead(config.dashboard, email, undefined, undefined);
    }
    if (config.onLead) {
      try {
        await config.onLead({ email });
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setLeadSent(true);
      setLeadOpen(false);
      setLeadEmail("");
    }
  }

  const displayName = config.name;
  const bubbleAriaLabel = open ? "Close chat" : `Open chat with ${displayName}`;

  return (
    <div className="probot-root" style={themedRoot}>
      <style>{widgetCss}</style>

      <div className="probot-dialog" hidden={!open}>
        <header className="probot-header">
          <div className="probot-avatar-wrap">
            <BotAvatar variant="header" src={config.avatarUrl} />
            <span className="probot-online-dot" aria-hidden="true" />
          </div>
          <div className="probot-titles">
            <div className="probot-title">
              {displayName}
              <span className="probot-title-suffix">· AI Assistant</span>
            </div>
            {config.headline ? (
              <div className="probot-subtitle">{config.headline}</div>
            ) : (
              <div className="probot-subtitle probot-subtitle-online">
                Online now
              </div>
            )}
          </div>
          <button
            type="button"
            className="probot-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="probot-body">
          <div className="probot-messages" ref={messagesRef}>
            <MessageRow
              role="bot"
              content={`Hi! I'm ${displayName}. Ask me anything.`}
              avatarUrl={config.avatarUrl}
            />
            {chat.messages.map((m, i) => (
              <MessageRow
                key={i}
                role={m.role === "assistant" ? "bot" : "user"}
                content={m.content}
                avatarUrl={config.avatarUrl}
              />
            ))}
            {chat.busy ? <TypingRow avatarUrl={config.avatarUrl} /> : null}
          </div>

          {showInlineChips ? (
            <div className="probot-suggested">
              {suggestions.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  className="probot-chip"
                  onClick={() => void chat.send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {hasSuggestions ? (
          <div className="probot-suggest-list" hidden={!suggestListOpen}>
            <p className="probot-suggest-list-heading">Suggested questions</p>
            <ul className="probot-suggest-list-items">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    className="probot-suggest-list-item"
                    onClick={() => {
                      setSuggestListOpen(false);
                      void chat.send(q);
                    }}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form
          className="probot-inputbar"
          onSubmit={(e) => {
            e.preventDefault();
            void chat.send();
          }}
          noValidate
        >
          {showSuggestToggle ? (
            <button
              type="button"
              className={
                suggestListOpen
                  ? "probot-suggest-toggle probot-suggest-toggle-active"
                  : "probot-suggest-toggle"
              }
              onClick={() => setSuggestListOpen((v) => !v)}
              aria-label="Suggested questions"
              aria-expanded={suggestListOpen}
            >
              <LightbulbIcon />
            </button>
          ) : null}
          <input
            className="probot-input"
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            placeholder={`Ask anything about ${displayName}…`}
            aria-label="Type your message"
            autoComplete="off"
            maxLength={1000}
            disabled={chat.busy}
          />
          <button
            type="submit"
            className="probot-send"
            disabled={chat.busy || chat.input.trim().length === 0}
            aria-label="Send"
          >
            <ArrowUpIcon />
          </button>
        </form>

        {chat.error ? (
          <div className="probot-notice" role="alert">
            {chat.error}
          </div>
        ) : null}

        {config.captureLead ? (
          <LeadCaptureStrip
            open={leadOpen}
            sent={leadSent}
            email={leadEmail}
            setEmail={setLeadEmail}
            onOpen={() => setLeadOpen(true)}
            onSubmit={submitLead}
          />
        ) : null}

        <footer className="probot-footer">
          <a
            href="https://pro-bot.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by ProBot
          </a>
        </footer>
      </div>

      <button
        type="button"
        className="probot-bubble"
        onClick={() => setOpen((v) => !v)}
        aria-label={bubbleAriaLabel}
      >
        <SparklesIcon />
      </button>
    </div>
  );
}

function MessageRow({
  role,
  content,
  avatarUrl,
}: {
  role: "bot" | "user";
  content: string;
  avatarUrl: string | undefined;
}) {
  if (role === "bot") {
    return (
      <div className="probot-msg-row probot-msg-row-bot">
        <BotAvatar variant="mini" src={avatarUrl} />
        <div
          className="probot-msg probot-msg-bot"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    );
  }
  return (
    <div className="probot-msg-row probot-msg-row-user">
      <div className="probot-msg probot-msg-user">{content}</div>
    </div>
  );
}

function TypingRow({ avatarUrl }: { avatarUrl: string | undefined }) {
  return (
    <div className="probot-msg-row probot-msg-row-bot">
      <BotAvatar variant="mini" src={avatarUrl} />
      <div
        className="probot-msg probot-msg-bot probot-typing"
        aria-label="Assistant is typing"
      >
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

// Bot avatar: real image when supplied, otherwise the two-dot ProBot mark
// on a theme-tinted circle. Matches `renderBotAvatar` in the managed
// widget so the two products render the same fallback.
function BotAvatar({
  variant,
  src,
}: {
  variant: "header" | "mini";
  src: string | undefined;
}) {
  const cls = variant === "header" ? "probot-avatar" : "probot-avatar-mini";
  if (src) {
    return <img className={cls} src={src} alt="" />;
  }
  return (
    <div className={`${cls} probot-avatar-fallback`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="14" cy="20" r="3.4" fill="#fff" />
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
      </svg>
    </div>
  );
}

function LeadCaptureStrip({
  open,
  sent,
  email,
  setEmail,
  onOpen,
  onSubmit,
}: {
  open: boolean;
  sent: boolean;
  email: string;
  setEmail: (v: string) => void;
  onOpen: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (sent) {
    return (
      <div className="probot-notice" role="status">
        Thanks — we&apos;ll be in touch.
      </div>
    );
  }
  if (!open) {
    return (
      <div className="probot-suggested" style={{ padding: "0 14px 10px" }}>
        <button
          type="button"
          className="probot-chip"
          onClick={onOpen}
        >
          Leave your email
        </button>
      </div>
    );
  }
  return (
    <form className="probot-inputbar" onSubmit={onSubmit} noValidate>
      <input
        className="probot-input"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email"
      />
      <button type="submit" className="probot-send" aria-label="Send email">
        <ArrowUpIcon />
      </button>
    </form>
  );
}

function SparklesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

// Escape user-controlled strings before interpolating into HTML. Mirrors
// `escapeHtml` in the managed widget.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal markdown → HTML for bot replies. Byte-for-byte port of
// `renderMarkdown` in the managed widget so both surfaces format the same
// LLM output identically. See `src/widget/widget.ts` for the design
// rationale (bundle-size trade-off vs. react-markdown + remark-gfm).
function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      i++;
      blocks.push(
        `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1]!.length;
      blocks.push(`<h${level}>${renderInline(h[2]!)}</h${level}>`);
      i++;
      continue;
    }

    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push("<hr>");
      i++;
      continue;
    }

    if (/^>/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>/.test(lines[i] ?? "")) {
        parts.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        `<blockquote>${renderInline(parts.join("<br>"))}</blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^[-*]\s+/, "");
        items.push(`<li>${renderInline(content)}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^\d+\.\s+/, "");
        items.push(`<li>${renderInline(content)}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,6}\s|>|\`\`\`|[-*]\s|\d+\.\s|([-*_])\2{2,}\s*$)/.test(
        lines[i] ?? "",
      )
    ) {
      paragraph.push(lines[i] ?? "");
      i++;
    }
    blocks.push(`<p>${renderInline(paragraph.join("<br>"))}</p>`);
  }
  return blocks.join("");
}

function renderInline(text: string): string {
  let s = escapeHtml(text);

  const codes: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_m, c: string) => {
    const idx = codes.push(`<code>${c}</code>`) - 1;
    return `\x00C${idx}\x00`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => {
    const safe = /^(https?:|mailto:)/i.test(u) ? u : "#";
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  });

  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|\W)_(.+?)_(\W|$)/g, "$1<em>$2</em>$3");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  s = s.replace(/\x00C(\d+)\x00/g, (_m, i: string) => codes[Number(i)] ?? "");
  return s;
}

// Re-exported so consumers importing from the ProbotBot entry can access
// the ChatMessage type without a second import path. Public surface stays
// unchanged (also re-exported from `index.ts`).
export type { ChatMessage };

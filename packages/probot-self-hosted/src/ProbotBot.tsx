import { useEffect, useState } from "react";

import { reportLead } from "./adapters/dashboard";
import { useProbotChat } from "./hooks/useProbotChat";
import type { ProbotBotConfig } from "./types";

const DEFAULT_LOADING = ["Thinking…", "One moment…", "Let me check…", "Working on it…"];
const DEFAULT_THEME = "#2563eb";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// Drop-in React chat widget. Renders a floating button that opens a chat
// panel; consumers can pass a full config object and a `sendMessage`
// implementation (typically a fetch to their own /api/chat proxy).
export function ProbotBot(config: ProbotBotConfig) {
  const [open, setOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);

  const chat = useProbotChat(config);
  const theme = config.themeColor ?? DEFAULT_THEME;
  const loading = config.loadingMessages?.length
    ? config.loadingMessages
    : DEFAULT_LOADING;

  useEffect(() => {
    if (!chat.busy) return;
    const t = window.setInterval(() => setLoadingIdx((i) => i + 1), 1500);
    return () => window.clearInterval(t);
  }, [chat.busy]);

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

  return (
    <div className="probot-root">
      <style>{styles}</style>
      {open ? (
        <div className="probot-panel" role="dialog" aria-label={`${config.name} chat`}>
          <header className="probot-header" style={{ background: theme }}>
            <div className="probot-avatar">
              {config.avatarUrl ? (
                <img src={config.avatarUrl} alt="" />
              ) : (
                <span>{initials(config.name)}</span>
              )}
            </div>
            <div className="probot-title">
              <strong>{config.name}</strong>
              {config.headline ? <small>{config.headline}</small> : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="probot-close"
            >
              ×
            </button>
          </header>

          <div className="probot-body">
            {chat.messages.length === 0 && config.suggestedQuestions?.length ? (
              <div className="probot-suggested">
                {config.suggestedQuestions.map((q) => (
                  <button key={q} type="button" onClick={() => void chat.send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            {chat.messages.map((m, i) => (
              <div key={i} className={`probot-msg probot-msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            {chat.busy ? (
              <div className="probot-msg probot-msg-assistant probot-busy">
                {loading[loadingIdx % loading.length]}
              </div>
            ) : null}
            {chat.error ? <p className="probot-error">{chat.error}</p> : null}
          </div>

          <form
            className="probot-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void chat.send();
            }}
          >
            <input
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              placeholder="Ask me anything…"
              aria-label="Type your message"
            />
            <button type="submit" disabled={chat.busy} style={{ background: theme }}>
              Send
            </button>
          </form>

          {config.captureLead ? (
            <div className="probot-lead-row">
              {leadSent ? (
                <span className="probot-lead-done">Thanks - we'll be in touch.</span>
              ) : leadOpen ? (
                <form onSubmit={submitLead} className="probot-lead-form">
                  <input
                    type="email"
                    required
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email"
                  />
                  <button type="submit" style={{ background: theme }}>Send</button>
                </form>
              ) : (
                <button
                  type="button"
                  className="probot-lead-cta"
                  onClick={() => setLeadOpen(true)}
                >
                  Leave your email
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="probot-fab"
        style={{ background: theme }}
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}

const styles = `
.probot-root { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; }
.probot-fab { border: none; color: #fff; width: 56px; height: 56px; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
.probot-panel { position: absolute; right: 0; bottom: 72px; width: 360px; max-width: calc(100vw - 24px); height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; }
.probot-header { color: #fff; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
.probot-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.25); display: grid; place-items: center; font-weight: 700; font-size: 12px; overflow: hidden; }
.probot-avatar img { width: 100%; height: 100%; object-fit: cover; }
.probot-title { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.1; }
.probot-title small { opacity: 0.85; font-size: 11px; }
.probot-close { background: transparent; color: #fff; border: none; font-size: 22px; cursor: pointer; }
.probot-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }
.probot-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
.probot-msg-user { align-self: flex-end; background: #dbeafe; color: #1e293b; }
.probot-msg-assistant { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; }
.probot-busy { opacity: 0.7; font-style: italic; }
.probot-error { color: #b91c1c; font-size: 12px; }
.probot-suggested { display: flex; flex-wrap: wrap; gap: 6px; }
.probot-suggested button { background: #fff; border: 1px solid #e5e7eb; border-radius: 999px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.probot-composer { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e7eb; background: #fff; }
.probot-composer input { flex: 1; padding: 8px 10px; border-radius: 10px; border: 1px solid #e5e7eb; font-size: 14px; outline: none; }
.probot-composer button { border: none; color: #fff; padding: 8px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.probot-composer button:disabled { opacity: 0.6; cursor: not-allowed; }
.probot-lead-row { padding: 8px 10px; border-top: 1px solid #e5e7eb; background: #fff; font-size: 12px; }
.probot-lead-cta { background: transparent; border: none; color: #2563eb; cursor: pointer; font-weight: 600; }
.probot-lead-form { display: flex; gap: 6px; }
.probot-lead-form input { flex: 1; padding: 6px 8px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 12px; }
.probot-lead-form button { border: none; color: #fff; padding: 6px 10px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.probot-lead-done { color: #16a34a; font-weight: 600; }
`;

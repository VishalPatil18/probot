"use client";

import { useRef, useState } from "react";

// Minimal chat UI for the self-hosted runtime. Posts to the local /api/chat
// route (which talks to the platform + the LLM). Intentionally dependency-free
// and unstyled-beyond-basics - the point is the wiring, not the design. Replace
// with the platform's themed widget or your own UI as you like.

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef(crypto.randomUUID());

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, sessionId: sessionId.current }),
      });
      const data = await res.json();
      setTurns((t) => [
        ...t,
        { role: "assistant", content: data.reply ?? "(no reply)" },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1>Chat</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {turns.map((t, i) => (
          <p key={i}>
            <strong>{t.role === "user" ? "You" : "Bot"}:</strong> {t.content}
          </p>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask me anything…"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={send} disabled={busy}>
          Send
        </button>
      </div>
    </main>
  );
}

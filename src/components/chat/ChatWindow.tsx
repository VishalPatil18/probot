"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ProviderName } from "@/lib/ai/providers";
import { getEmbeddingApiKey } from "@/lib/client/embedding-key-store";
import { getApiKey, getAzureCreds } from "@/lib/client/llm-key-store";
import { getOrCreateSessionId } from "@/lib/client/session-id-store";

import { LoadingAnimation } from "./LoadingAnimation";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "./types";

const INPUT_MAX = 8000;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type Props = {
  botId: string;
  botName: string;
  botHeadline: string | null;
  suggestedQuestions: string[];
  loadingMessages: string[];
  llmProvider: ProviderName;
};

export function ChatWindow({
  botId,
  botName,
  botHeadline,
  suggestedQuestions,
  loadingMessages,
  llmProvider,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || loading) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setMissingKey(true);
      return;
    }

    // Azure also needs endpoint + apiVersion alongside the key.
    let azureCreds: ReturnType<typeof getAzureCreds> = null;
    if (llmProvider === "azure") {
      azureCreds = getAzureCreds();
      if (!azureCreds) {
        setMissingKey(true);
        return;
      }
    }
    setMissingKey(false);

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text: trimmed },
    ]);
    setInput("");
    setLoading(true);

    // BYO credentials ride ONLY in headers - never in the JSON body.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-llm-api-key": apiKey,
    };
    if (azureCreds) {
      headers["x-llm-azure-endpoint"] = azureCreds.endpoint;
      headers["x-llm-azure-api-version"] = azureCreds.apiVersion;
    }
    // Stage 3 RAG: include the optional OpenAI embedding key. Absent →
    // server skips retrieval and falls back to full-context. Same security
    // model as the chat key (localStorage only, never persisted server-side).
    const embeddingKey = getEmbeddingApiKey();
    if (embeddingKey) {
      headers["x-embedding-api-key"] = embeddingKey;
    }

    // Stage 6 §6.1: per-tab session ID lets the server UPSERT a
    // `conversations` row and coalesce multiple turns from the same tab
    // into a single conversation for dashboard analytics.
    const sessionId = getOrCreateSessionId();

    try {
      const res = await fetch(`/api/chat/${botId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", rateLimitMessage: true },
        ]);
        return;
      }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            text: "Sorry - something went wrong on my end. Please try again.",
          },
        ]);
        return;
      }

      const body = (await res.json()) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", text: body.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: "Network error. Check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const showSuggestions =
    messages.length === 0 && suggestedQuestions.length > 0;

  return (
    <div className="h-screen flex flex-col bg-bg-app">
      <ChatHeader botName={botName} botHeadline={botHeadline} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <MessageBubble
              message={{
                id: "intro",
                role: "assistant",
                text: `👋 Hi! I'm ${botName}'s AI assistant. Ask me anything about their experience, skills, or availability.`,
              }}
            />
          )}

          {showSuggestions && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelect={send}
            />
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {loading && <LoadingAnimation messages={loadingMessages} />}
        </div>
      </div>

      <div className="bg-white border-t border-border-base shrink-0">
        <div className="mx-auto max-w-3xl px-5 py-4">
          {missingKey && (
            <div
              role="alert"
              className="mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2"
            >
              No API key found.{" "}
              <Link
                href="/dashboard/bots/new"
                className="underline font-semibold"
              >
                Add your API key in bot settings
              </Link>{" "}
              to start chatting.
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border border-border-base rounded-2xl px-3 py-2 focus-within:border-brand transition-colors bg-white"
          >
            <textarea
              aria-label="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={INPUT_MAX}
              placeholder={`Ask anything about ${botName}…`}
              disabled={loading}
              className="flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-[120px] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length === 0}
              aria-label="Send message"
              className="size-9 grid place-items-center rounded-xl brand-blue-gradient text-white shrink-0 disabled:opacity-40"
            >
              ↑
            </button>
          </form>
          <p className="text-[10px] text-muted text-center mt-2">
            ProBot answers are grounded in {botName}&apos;s data and may be
            imperfect · {input.length}/{INPUT_MAX}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({
  botName,
  botHeadline,
}: {
  botName: string;
  botHeadline: string | null;
}) {
  const initials =
    botName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] ?? "")
      .join("")
      .toUpperCase() || "AI";

  return (
    <header className="bg-white border-b border-border-base shrink-0">
      <div className="mx-auto max-w-3xl px-5 py-4 flex items-center gap-4">
        <div className="size-12 rounded-full brand-blue-gradient grid place-items-center text-white font-display font-extrabold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight truncate">
            {botName}{" "}
            <span className="text-muted font-sans font-normal text-sm">
              · AI Recruiter
            </span>
          </h1>
          {botHeadline && (
            <p className="text-xs text-muted truncate">{botHeadline}</p>
          )}
        </div>
      </div>
    </header>
  );
}

function SuggestedQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (q: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pl-11">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="px-3.5 py-2 rounded-full bg-white border border-border-base text-sm font-medium hover:border-brand hover:text-brand transition-colors shadow-soft"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

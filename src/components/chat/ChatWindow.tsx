"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ProviderName } from "@/lib/ai/providers";
import { getEmbeddingApiKey } from "@/lib/client/embedding-key-store";
import {
  readLeadCaptureState,
  writeLeadCaptureState,
} from "@/lib/client/lead-capture-state";
import { getApiKey, getAzureCreds } from "@/lib/client/llm-key-store";
import { getOrCreateSessionId } from "@/lib/client/session-id-store";

import { LeadCaptureCard } from "./LeadCaptureCard";
import { LoadingAnimation } from "./LoadingAnimation";
import { BotAvatarIcon } from "./BotAvatarIcon";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "./types";

const LEAD_CAPTURE_THRESHOLD = 3;
const CONTEXT_SUMMARY_MAX = 300;

function shouldShowLeadCard(
  messages: ChatMessage[],
  botId: string,
  sessionId: string | null,
): boolean {
  if (!sessionId) return false;
  const assistantReplies = messages.filter(
    (m) => m.role === "assistant" && "text" in m,
  ).length;
  if (assistantReplies < LEAD_CAPTURE_THRESHOLD) return false;
  if (messages.some((m) => m.role === "system")) return false;
  return readLeadCaptureState(botId, sessionId) === "pending";
}

function buildContextSummary(messages: ChatMessage[]): string {
  const firstUserMessages = messages
    .filter(
      (m): m is Extract<ChatMessage, { role: "user" }> => m.role === "user",
    )
    .slice(0, 3)
    .map((m) => m.text);
  const joined = firstUserMessages.join(" · ");
  return joined.length > CONTEXT_SUMMARY_MAX
    ? `${joined.slice(0, CONTEXT_SUMMARY_MAX - 1)}…`
    : joined;
}

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
  botImage?: string | null;
  themeColor?: string;
  suggestedQuestions: string[];
  loadingMessages: string[];
  llmProvider: ProviderName;
  previewToken?: string | null;
};

export function ChatWindow({
  botId,
  botName,
  botHeadline,
  botImage,
  themeColor = "#0070dd",
  suggestedQuestions,
  loadingMessages,
  llmProvider,
  previewToken,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);
  const [showSuggestionList, setShowSuggestionList] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState<string | null>(() =>
    typeof window !== "undefined" ? getOrCreateSessionId() : null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (loading) return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || loading) return;
    setShowSuggestionList(false);

    const apiKey = await getApiKey();
    if (!apiKey) {
      setMissingKey(true);
      return;
    }

    let azureCreds: Awaited<ReturnType<typeof getAzureCreds>> = null;
    if (llmProvider === "azure") {
      azureCreds = await getAzureCreds();
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-llm-api-key": apiKey,
    };
    if (azureCreds) {
      headers["x-llm-azure-endpoint"] = azureCreds.endpoint;
      headers["x-llm-azure-api-version"] = azureCreds.apiVersion;
    }
    const embeddingKey = await getEmbeddingApiKey();
    if (embeddingKey) {
      headers["x-embedding-api-key"] = embeddingKey;
    }
    if (previewToken) {
      headers["x-preview-token"] = previewToken;
    }

    const effectiveSessionId = sessionId ?? getOrCreateSessionId();

    try {
      const res = await fetch(`/api/chat/${botId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: trimmed,
          sessionId: effectiveSessionId,
        }),
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

      const body = (await res.json()) as {
        reply: string;
        conversationId?: string;
      };
      if (body.conversationId) {
        setConversationId(body.conversationId);
      }
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          { id: newId(), role: "assistant", text: body.reply },
        ];
        if (shouldShowLeadCard(next, botId, sessionId)) {
          next.push({
            id: newId(),
            role: "system",
            kind: "lead_capture",
          });
          if (sessionId) {
            writeLeadCaptureState(botId, sessionId, "shown");
          }
        }
        return next;
      });
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

  const hasSuggestions = suggestedQuestions.length > 0;
  const conversationStarted = messages.length > 0;

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-gradient-to-b from-white to-neutral-50"
      style={{ "--bot-accent": themeColor } as React.CSSProperties}
    >
      <ChatHeader
        botName={botName}
        botHeadline={botHeadline}
        botImage={botImage}
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6">
          {messages.length === 0 && (
            <MessageBubble
              botImage={botImage}
              message={{
                id: "intro",
                role: "assistant",
                text: `👋 Hi! I'm ${botName}'s AI assistant. Ask me anything about their experience, skills, or availability.`,
              }}
            />
          )}

          {messages.map((m) => {
            if (m.role === "system") {
              if (m.kind === "lead_capture") {
                return (
                  <LeadCaptureCard
                    key={m.id}
                    botId={botId}
                    botName={botName}
                    conversationId={conversationId}
                    contextSummary={buildContextSummary(messages)}
                    onDismiss={() => {
                      setMessages((prev) => prev.filter((x) => x.id !== m.id));
                      if (sessionId) {
                        writeLeadCaptureState(botId, sessionId, "dismissed");
                      }
                    }}
                    onCaptured={() => {
                      if (sessionId) {
                        writeLeadCaptureState(botId, sessionId, "captured");
                      }
                    }}
                  />
                );
              }
              const _exhaustive: never = m.kind;
              void _exhaustive;
              return null;
            }
            return <MessageBubble key={m.id} botImage={botImage} message={m} />;
          })}

          {loading && (
            <LoadingAnimation messages={loadingMessages} botImage={botImage} />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border-base bg-white/90 backdrop-blur">
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
          {hasSuggestions && !conversationStarted && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelect={send}
            />
          )}

          {hasSuggestions && showSuggestionList && (
            <div className="mb-3 overflow-hidden rounded-2xl border border-border-base bg-white shadow-soft">
              <p className="border-b border-border-base px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Suggested questions
              </p>
              <ul className="thin-scroll max-h-48 overflow-y-auto">
                {suggestedQuestions.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => void send(q)}
                      className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 hover:text-[color:var(--bot-accent)]"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-border-base bg-white px-3 py-2 shadow-soft transition-all focus-within:border-[color:var(--bot-accent)] focus-within:shadow-md"
          >
            {hasSuggestions && conversationStarted && (
              <button
                type="button"
                onClick={() => setShowSuggestionList((v) => !v)}
                aria-label="Suggested questions"
                aria-expanded={showSuggestionList}
                className={`grid size-9 shrink-0 place-items-center rounded-full border transition-colors ${
                  showSuggestionList
                    ? "border-[color:var(--bot-accent)] text-[color:var(--bot-accent)]"
                    : "border-border-base text-muted hover:border-[color:var(--bot-accent)] hover:text-[color:var(--bot-accent)]"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
                </svg>
              </button>
            )}
            <textarea
              ref={textareaRef}
              aria-label="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={INPUT_MAX}
              placeholder={`Ask anything about ${botName}…`}
              disabled={loading}
              className="thin-scroll max-h-24 flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length === 0}
              aria-label="Send message"
              style={{ background: "var(--bot-accent, #0070dd)" }}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              ↑
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted">
            <a
              href="https://pro-bot.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand transition-colors hover:underline"
            >
              Powered by ProBot
            </a>{" "}
            · {input.length}/{INPUT_MAX}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({
  botName,
  botHeadline,
  botImage,
}: {
  botName: string;
  botHeadline: string | null;
  botImage?: string | null;
}) {
  return (
    <header className="shrink-0 border-b border-border-base bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-3.5">
        <div className="relative shrink-0">
          <span className="block rounded-full ring-2 ring-[color:var(--bot-accent)] ring-offset-2 ring-offset-white">
            <BotAvatarIcon
              image={botImage}
              name={botName}
              sizeClass="size-11"
            />
          </span>
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight">
            {botName}{" "}
            <span className="font-sans text-sm font-normal text-muted">
              · AI Assistant
            </span>
          </h1>
          {botHeadline ? (
            <p className="truncate text-xs text-muted">{botHeadline}</p>
          ) : (
            <p className="text-xs font-medium text-emerald-600">Online now</p>
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
    <div className="mb-3 flex flex-wrap gap-2">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="rounded-full border border-border-base bg-white px-3.5 py-2 text-sm font-medium shadow-soft transition-colors hover:border-[color:var(--bot-accent)] hover:text-[color:var(--bot-accent)]"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

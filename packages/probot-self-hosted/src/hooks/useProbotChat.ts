import { useCallback, useMemo, useRef, useState } from "react";

import { reportConversation } from "../adapters/dashboard";
import { buildSystemPrompt } from "../prompt";
import type { ChatMessage, ProbotBotConfig, UseProbotChatReturn } from "../types";

function randomId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useProbotChat(config: ProbotBotConfig): UseProbotChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(randomId()).current;

  const system = useMemo(() => buildSystemPrompt(config), [config]);

  const send = useCallback(
    async (text?: string) => {
      const raw = (text ?? input).trim();
      if (!raw || busy) return;
      const nextTurn: ChatMessage = { role: "user", content: raw };
      const history: ChatMessage[] = [...messages, nextTurn];
      setInput("");
      setMessages(history);
      setBusy(true);
      setError(null);
      try {
        const reply = await config.sendMessage({ system, messages: history });
        const withReply: ChatMessage[] = [
          ...history,
          { role: "assistant", content: reply },
        ];
        setMessages(withReply);
        if (config.dashboard) {
          void reportConversation(config.dashboard, sessionId, withReply);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "chat_failed");
      } finally {
        setBusy(false);
      }
    },
    [busy, config, input, messages, sessionId, system],
  );

  return { messages, input, setInput, send, busy, error, sessionId };
}

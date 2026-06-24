// Typed client for the ProBot platform's versioned bot API (/api/v1/bot/*).
// Every call carries the bot token; this module runs server-side only so the
// token never reaches the browser. Pinned to /api/v1 - if the platform ships
// /api/v2 with breaking changes, bump this client deliberately.

const API_URL = process.env.PROBOT_API_URL ?? "https://pro-bot.dev";
const BOT_TOKEN = process.env.PROBOT_BOT_TOKEN ?? "";

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${BOT_TOKEN}`,
    "content-type": "application/json",
  };
}

export interface BotConfig {
  id: string;
  name: string;
  headline: string | null;
  personality: string;
  themeColor: string | null;
  image: string | null;
  suggestedQuestions: string[];
  loadingMessages: string[];
  isActive: boolean;
  deploymentMode: "managed" | "self_hosted";
}

export async function getConfig(): Promise<BotConfig> {
  const res = await fetch(`${API_URL}/api/v1/bot/config`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`platform config failed: ${res.status}`);
  return res.json();
}

export async function getKnowledge(
  query: string,
  embeddingApiKey?: string,
): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/v1/bot/knowledge`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, embeddingApiKey }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`platform knowledge failed: ${res.status}`);
  const data: { chunks: string[] } = await res.json();
  return data.chunks ?? [];
}

export async function postConversation(
  sessionId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/v1/bot/conversations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ sessionId, messages }),
  });
  if (!res.ok) return null;
  const data: { conversationId: string } = await res.json();
  return data.conversationId ?? null;
}

export async function postLead(
  email: string,
  conversationId?: string,
  contextSummary?: string,
): Promise<void> {
  await fetch(`${API_URL}/api/v1/bot/leads`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, conversationId, contextSummary }),
  });
}

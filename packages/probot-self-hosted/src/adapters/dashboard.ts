import type { ChatMessage, DashboardLink } from "../types";

const DEFAULT_API_URL = "https://pro-bot.dev";

function authHeaders(link: DashboardLink): HeadersInit {
  return {
    authorization: `Bearer ${link.token}`,
    "content-type": "application/json",
  };
}

export async function reportConversation(
  link: DashboardLink,
  sessionId: string,
  messages: ChatMessage[],
): Promise<string | null> {
  const base = link.apiUrl ?? DEFAULT_API_URL;
  try {
    const res = await fetch(`${base}/api/v1/bot/conversations`, {
      method: "POST",
      headers: authHeaders(link),
      body: JSON.stringify({ sessionId, messages }),
    });
    if (!res.ok) return null;
    const data: { conversationId?: string } = await res.json();
    return data.conversationId ?? null;
  } catch {
    return null;
  }
}

export async function reportLead(
  link: DashboardLink,
  email: string,
  conversationId?: string,
  contextSummary?: string,
): Promise<boolean> {
  const base = link.apiUrl ?? DEFAULT_API_URL;
  try {
    const res = await fetch(`${base}/api/v1/bot/leads`, {
      method: "POST",
      headers: authHeaders(link),
      body: JSON.stringify({ email, conversationId, contextSummary }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

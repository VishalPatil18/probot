"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotificationPayload = {
  leadId?: string;
  email?: string;
  botId?: string;
  botName?: string;
  contextSummary?: string | null;
  sessionId?: string;
  conversationId?: string;
  origin?: "self_hosted" | "managed";
  sourcesTouched?: number;
  filesAdded?: number;
  includesManualText?: boolean;
  totalTokens?: number;
  truncated?: boolean;
};

type NotificationItem = {
  id: string;
  kind: string;
  payload: NotificationPayload;
  readAt: string | null;
  createdAt: string;
  botId: string | null;
};

type ListResponse = {
  items: NotificationItem[];
  notifyLeadsEmail?: boolean;
  total: number;
  unreadCount: number;
};

type Props = {
  onClose: () => void;
  onAllRead: () => void;
  onItemRead: (id: string) => void;
};

function describe(n: NotificationItem): { title: string; body: string } {
  const bot = n.payload.botName ?? "your bot";
  if (n.kind === "lead_captured") {
    return {
      title: n.payload.email ?? "New lead",
      body: n.payload.contextSummary ?? "",
    };
  }
  if (n.kind === "conversation_started") {
    return {
      title: `New conversation on ${bot}`,
      body:
        n.payload.origin === "self_hosted"
          ? "A visitor started chatting from a self-hosted embed."
          : "A visitor started chatting from the public chat.",
    };
  }
  if (n.kind === "knowledge_updated") {
    const files = n.payload.filesAdded ?? 0;
    return {
      title: `Knowledge updated on ${bot}`,
      body:
        files > 0
          ? `${files} file${files === 1 ? "" : "s"} ingested.`
          : n.payload.includesManualText
            ? "Pasted text ingested."
            : "Knowledge base changed.",
    };
  }
  return { title: n.kind, body: "" };
}

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function NotificationDropdown({
  onClose,
  onAllRead,
  onItemRead,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [emailLeads, setEmailLeads] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/notifications?limit=10")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: ListResponse) => {
        if (!alive) return;
        setItems(body.items);
        if (typeof body.notifyLeadsEmail === "boolean") {
          setEmailLeads(body.notifyLeadsEmail);
        }
      })
      .catch(() => {
        if (alive) setError("Couldn't load notifications.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function toggleEmailLeads(next: boolean) {
    setEmailLeads(next);
    try {
      const res = await fetch("/api/users/me/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyLeadsEmail: next }),
      });
      if (!res.ok) setEmailLeads(!next);
    } catch {
      setEmailLeads(!next);
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (!item.readAt) {
      void fetch(`/api/notifications/${item.id}/read`, { method: "POST" });
      onItemRead(item.id);
    }
    const botId = item.botId ?? item.payload.botId;
    if (item.kind === "lead_captured" && botId) {
      router.push(`/dashboard/bots/${botId}/leads`);
    } else if (item.kind === "conversation_started" && botId) {
      router.push(`/dashboard/bots/${botId}/conversations`);
    } else if (item.kind === "knowledge_updated" && botId) {
      router.push(`/dashboard/bots/${botId}/configuration?tab=kb`);
    }
    onClose();
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Couldn't clear notifications.");
        return;
      }
      onAllRead();
    } catch {
      setError("Network error. Try again.");
    }
  }

  const unreadInList = items?.filter((i) => !i.readAt).length ?? 0;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-border-base bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border-base px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        {unreadInList > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items === null && error === null ? (
          <p className="px-4 py-6 text-center text-xs text-muted">Loading…</p>
        ) : error ? (
          <p
            role="alert"
            className="px-4 py-6 text-center text-xs text-rose-600"
          >
            {error}
          </p>
        ) : items && items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="divide-y divide-border-base">
            {items?.map((item) => {
              const { title, body } = describe(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 ${
                      item.readAt ? "" : "bg-brand/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!item.readAt ? (
                        <span
                          aria-label="unread"
                          className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-brand"
                        />
                      ) : (
                        <span className="mt-1.5 inline-block size-2 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-base">
                          {title}
                        </p>
                        {body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted">
                          {relTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {emailLeads !== null ? (
        <label className="flex items-center justify-between gap-3 border-t border-border-base px-4 py-3 text-xs">
          <span className="font-medium text-ink">Email me new leads</span>
          <input
            type="checkbox"
            checked={emailLeads}
            onChange={(e) => void toggleEmailLeads(e.target.checked)}
            className="h-4 w-4 rounded border-border-base text-brand focus:ring-brand"
          />
        </label>
      ) : null}
    </div>
  );
}

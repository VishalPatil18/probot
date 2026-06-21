"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotificationPayload = {
  leadId?: string;
  email?: string;
  botId?: string;
  botName?: string;
  contextSummary?: string | null;
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
  total: number;
  unreadCount: number;
};

type Props = {
  onClose: () => void;
  onAllRead: () => void;
  onItemRead: (id: string) => void;
};

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

// Dropdown panel that mounts inside <NotificationBell>. Fetches
// the most recent 10 notifications on open, supports per-item mark-read +
// navigate, and a "Mark all read" footer. Items are rendered with a
// pre-denormalized payload (botName, email, contextSummary, etc.) so no
// follow-up join queries are needed.
export function NotificationDropdown({
  onClose,
  onAllRead,
  onItemRead,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/notifications?limit=10")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: ListResponse) => {
        if (alive) setItems(body.items);
      })
      .catch(() => {
        if (alive) setError("Couldn't load notifications.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleItemClick(item: NotificationItem) {
    // Mark read first; the navigation can fire in parallel since the
    // mark-read endpoint is idempotent (404 on already-read returns
    // safely). We don't await before navigating.
    if (!item.readAt) {
      void fetch(`/api/notifications/${item.id}/read`, { method: "POST" });
      onItemRead(item.id);
    }
    const botId = item.botId ?? item.payload.botId;
    const leadId = item.payload.leadId;
    if (item.kind === "lead_captured" && botId && leadId) {
      router.push(`/dashboard/bots/${botId}/leads`);
    }
    onClose();
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) {
        // Don't flip the local unread state on server failure - the next
        // poll will reconcile. A flicker is worse than no-op here.
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
            {items?.map((item) => (
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
                        {item.payload.email ?? "New lead"}
                      </p>
                      {item.payload.contextSummary ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {item.payload.contextSummary}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted">
                        {item.payload.botName
                          ? `${item.payload.botName} · `
                          : ""}
                        {relTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

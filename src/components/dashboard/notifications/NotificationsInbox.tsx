"use client";

import { useCallback, useEffect, useState } from "react";

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
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
};

const PAGE_LIMIT = 20;

function formatWhen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function describe(n: NotificationItem): { title: string; body: string } {
  const bot = n.payload.botName ?? "your bot";
  if (n.kind === "lead_captured") {
    const email = n.payload.email ?? "someone";
    return {
      title: `New lead: ${email}`,
      body: n.payload.contextSummary
        ? `${bot} captured this lead. ${n.payload.contextSummary}`
        : `${bot} captured this lead.`,
    };
  }
  if (n.kind === "conversation_started") {
    const where =
      n.payload.origin === "self_hosted"
        ? "from a self-hosted embed"
        : "from the public chat";
    return {
      title: `New conversation on ${bot}`,
      body: `A visitor started chatting ${where}.`,
    };
  }
  if (n.kind === "knowledge_updated") {
    const files = n.payload.filesAdded ?? 0;
    const manual = n.payload.includesManualText ? " and pasted text" : "";
    const suffix =
      files > 0
        ? `${files} file${files === 1 ? "" : "s"}${manual} ingested.`
        : `${manual.trim().length > 0 ? "Pasted text ingested." : "Knowledge base updated."}`;
    return {
      title: `Knowledge base updated on ${bot}`,
      body: n.payload.truncated
        ? `${suffix} Assembled context was truncated to fit the token cap.`
        : suffix,
    };
  }
  return { title: n.kind, body: "" };
}

export function NotificationsInbox() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/notifications?page=${p}&limit=${PAGE_LIMIT}`,
      );
      if (!res.ok) throw new Error("load_failed");
      const body: ListResponse = await res.json();
      setItems(body.items);
      setTotal(body.total);
      setPage(body.page);
    } catch {
      setError("Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function markRead(id: string) {
    const snapshot = items;
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems(snapshot);
      setError("Couldn't mark as read.");
    }
  }

  async function markAllRead() {
    const snapshot = items;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    const res = await fetch("/api/notifications/read-all", {
      method: "POST",
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems(snapshot);
      setError("Couldn't mark all as read.");
    }
  }

  async function deleteOne(id: string) {
    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    const res = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems(snapshot);
      setTotal((t) => t + 1);
      setError("Couldn't delete notification.");
    }
  }

  async function deleteAll() {
    setConfirmingDeleteAll(false);
    const snapshot = items;
    const snapshotTotal = total;
    setItems([]);
    setTotal(0);
    const res = await fetch("/api/notifications/delete-all", {
      method: "DELETE",
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems(snapshot);
      setTotal(snapshotTotal);
      setError("Couldn't delete all notifications.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasUnread = items.some((n) => n.readAt === null);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Notifications</h3>
          <p className="text-xs text-muted">
            {total === 0
              ? "You're all caught up."
              : `${total} ${total === 1 ? "notification" : "notifications"} total.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasUnread || loading}
            className="btn btn-secondary !py-1.5 text-xs disabled:opacity-50"
          >
            Mark all as read
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDeleteAll(true)}
            disabled={total === 0 || loading}
            className="!py-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Delete all
          </button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-base bg-white p-8 text-center">
          <p className="font-semibold">No notifications yet.</p>
          <p className="mt-1 text-xs text-muted">
            Lead captures and other alerts will land here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-base rounded-2xl border border-border-base bg-white">
          {items.map((n) => {
            const { title, body } = describe(n);
            const unread = n.readAt === null;
            return (
              <li key={n.id} className="flex items-start gap-3 p-4">
                <span
                  aria-hidden
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                    unread ? "bg-brand" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${unread ? "font-bold" : "font-medium text-muted"}`}
                  >
                    {title}
                  </p>
                  {body ? (
                    <p className="mt-0.5 text-xs text-muted">{body}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted">
                    {formatWhen(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {unread ? (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-blue-50"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteOne(n.id)}
                    aria-label="Delete notification"
                    className="rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-2 text-xs"
        >
          <button
            type="button"
            onClick={() => void load(page - 1)}
            disabled={page <= 1 || loading}
            className="btn btn-secondary !py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void load(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn btn-secondary !py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      ) : null}

      {confirmingDeleteAll ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
          onClick={() => setConfirmingDeleteAll(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete all notifications"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">
              Delete all notifications?
            </h3>
            <p className="mt-1 text-sm text-muted">
              This removes every notification for your account. Underlying
              conversations and leads stay untouched.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDeleteAll(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAll}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { NotificationDropdown } from "./NotificationDropdown";

const POLL_INTERVAL_MS = 30_000;

// Dashboard notification bell. Polls the unread-count
// endpoint every 30s while the tab is visible (pauses on Page Visibility
// API hidden, resumes + immediate refresh on visible). Click opens the
// dropdown panel. The badge caps at "9+" so it stays readable.
export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const body = (await res.json()) as { count: number };
      setUnread(body.count);
    } catch {
      // Swallow: a single failed poll shouldn't reset the badge to a stale
      // zero. The next successful poll will reconcile.
    }
  }, []);

  // Initial fetch + 30s polling loop, paused when the tab is hidden.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (intervalId !== null) return;
      void refresh();
      intervalId = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    }

    function stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  // Close the dropdown on outside click or ESC.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badgeLabel = unread > 9 ? "9+" : String(unread);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl p-2 text-text-base hover:bg-gray-100"
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>
      {open ? (
        <NotificationDropdown
          onClose={() => setOpen(false)}
          onAllRead={() => {
            setUnread(0);
            setOpen(false);
          }}
          onItemRead={() => {
            setUnread((prev) => (prev > 0 ? prev - 1 : 0));
          }}
        />
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

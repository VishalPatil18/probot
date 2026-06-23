"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";

// Landing-page "Watch demo" button + borderless video modal. The video URL is
// build-time injected via NEXT_PUBLIC_DEMO_VIDEO_URL (e.g. a YouTube embed
// URL). Until that's set, the modal shows a "coming soon" poster instead of a
// broken embed. Closing is a pure overlay dismiss - no navigation - so the
// page's scroll position is preserved. Esc and backdrop click also close.
const VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? "";

export function DemoVideoModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary !px-6 !py-3 !text-base"
      >
        <Icon name="play_circle" className="!text-lg" />
        See a live demo
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ProBot demo video"
            className="relative w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute -top-7 right-1 text-white/80 hover:text-white"
            >
              <CloseIcon />
            </button>

            {VIDEO_URL ? (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={VIDEO_URL}
                  title="ProBot demo"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center rounded-xl bg-neutral-900 px-6 text-center text-white">
                <div>
                  <p className="font-display text-2xl font-bold">
                    Demo coming soon
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
                    A one-minute walkthrough is on the way. In the meantime,
                    chat with a live bot.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

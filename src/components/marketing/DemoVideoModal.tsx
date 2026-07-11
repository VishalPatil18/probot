"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";

// Landing-page "See a live demo" button + borderless video modal. The video
// autoplays with sound when the modal opens and exposes the browser's native
// player controls (play/pause, scrub, volume, speed, fullscreen). Replace the
// placeholder URL below with the real Cloudinary asset link (or set
// NEXT_PUBLIC_DEMO_VIDEO_URL at build time).
const VIDEO_URL =
  "https://res.cloudinary.com/dbjdu0hvl/video/upload/v1782434715/probot/demo_mn8yv1.mp4";

export function DemoVideoModal() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Autoplay with sound when the modal opens. Opening is a user gesture, so
  // most browsers allow audible autoplay; if one still blocks it, fall back to
  // muted playback so the video at least plays - the native controls then let
  // the viewer unmute.
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    try {
      const played = video.play();
      if (played && typeof played.catch === "function") {
        played.catch(() => {
          video.muted = true;
          void video.play()?.catch(() => {});
        });
      }
    } catch {
      // jsdom / autoplay blocked - safe to ignore.
    }
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
            className="group/window relative w-[90vw] max-w-[1400px] overflow-hidden rounded-xl bg-neutral-900 shadow-2xl ring-1 ring-white/10 md:w-[70vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex items-center gap-2 border-b border-white/10 bg-gradient-to-b from-neutral-700 to-neutral-800 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-3 place-items-center rounded-full bg-[#ff5f57] text-black/70 outline-none ring-black/20 transition hover:brightness-105 focus-visible:ring-2"
              >
                <svg
                  viewBox="0 0 10 10"
                  width="6"
                  height="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  className="opacity-0 group-hover/window:opacity-100"
                  aria-hidden="true"
                >
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
              <span
                aria-hidden="true"
                className="size-3 rounded-full bg-[#febc2e]"
              />
              <span
                aria-hidden="true"
                className="size-3 rounded-full bg-[#28c840]"
              />
              <span className="pointer-events-none absolute inset-x-0 text-center text-xs font-medium text-white/60">
                ProBot Demo
              </span>
            </div>

            <div className="aspect-video bg-black">
              <video
                ref={videoRef}
                src={VIDEO_URL}
                className="h-full w-full"
                autoPlay
                playsInline
                controls
                controlsList="nodownload"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

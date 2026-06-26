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
            className="relative w-[90vw] max-w-[1400px] md:w-[70vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute -top-7 right-1 text-white/80 transition-colors hover:text-white"
            >
              <CloseIcon />
            </button>

            <div className="aspect-video overflow-hidden rounded-xl bg-black">
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

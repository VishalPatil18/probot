"use client";

import { useEffect, useState } from "react";

// Live preview of the chosen bot picture (or the default ProBot mark). Manages
// the object URL lifecycle so the blob is revoked when the file changes/clears.
export function BotAvatarPreview({
  file,
  sizeClass = "size-16",
  themeColor,
}: {
  file: File | null;
  sizeClass?: string;
  themeColor?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Bot picture preview"
        className={`${sizeClass} shrink-0 rounded-full border border-border-base object-cover`}
      />
    );
  }
  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-full ${
        themeColor ? "" : "brand-blue-gradient"
      }`}
      style={themeColor ? { background: themeColor } : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-3/5 w-3/5">
        <circle cx="14" cy="20" r="3.4" fill="#fff" />
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
      </svg>
    </div>
  );
}

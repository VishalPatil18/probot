"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface AvatarUploaderProps {
  initialImage: string | null;
  uploadUrl: string;
  // Fills the circle when there's no image (e.g. initials or the ProBot icon).
  fallback: React.ReactNode;
  ariaLabel?: string;
}

// Circular avatar that doubles as its own upload control: hovering reveals a
// camera overlay, clicking opens the file picker, and the chosen image is POSTed
// to `uploadUrl` (which returns `{ image }`). Shared by the account photo and
// the bot picture so both behave identically. Accepts jpg/jpeg/png/webp ≤2 MB;
// the server is the authoritative validator (magic-byte sniff).
export function AvatarUploader({
  initialImage,
  uploadUrl,
  fallback,
  ariaLabel = "Change photo",
}: AvatarUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(initialImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: data });
      if (!res.ok) {
        setError("Upload failed. Use a JPG, PNG, or WebP under 2 MB.");
        return;
      }
      const payload = (await res.json()) as { image: string };
      setImage(payload.image);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label={ariaLabel}
        className="group relative block size-20 overflow-hidden rounded-full"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="Avatar"
            className="size-20 rounded-full object-cover"
          />
        ) : (
          fallback
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-black/45 text-white transition-opacity ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {uploading ? (
            <span className="text-[10px] font-semibold">Uploading…</span>
          ) : (
            <CameraIcon />
          )}
        </span>
      </button>
      <p className="mt-2 text-center text-[11px] leading-tight text-muted">
        JPG · PNG · WebP
        <br />2 MB max
      </p>
      {error ? (
        <p className="mt-1 text-center text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

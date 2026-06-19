"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ANIMAL_AVATARS, isAllowedAvatar } from "@/lib/avatars";

type Props = {
  currentImage: string | null;
};

// Stage 4: dual-field onboarding — username + avatar. The avatar grid shows
// the 13 curated animal icons plus, when the user already has a non-animal
// `users.image` (e.g. Google/GitHub photo from OAuth), that image as a first
// "Keep current" card. Selecting an animal replaces the current image on
// submit; selecting "Keep current" leaves it unchanged.
export function OnboardingForm({ currentImage }: Props) {
  const router = useRouter();
  const hasExternalImage =
    currentImage !== null && !isAllowedAvatar(currentImage);

  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string>(
    currentImage ?? ANIMAL_AVATARS[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setError("Pick a username (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, image }),
      });
      if (res.status === 409) {
        setError("That username is taken. Pick another.");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          body.error === "validation_failed"
            ? "Username must be 3–30 lowercase letters, numbers, or hyphens."
            : "Could not save. Try again.",
        );
        return;
      }
      // Hard refresh because the session JWT carries the old username; a
      // full reload re-mints the token on the next /dashboard navigation.
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!submitting) void submit();
      }}
      className="space-y-8 rounded-2xl border border-border-base bg-white p-6 shadow-sm"
    >
      <div>
        <label
          htmlFor="onb-username"
          className="block text-sm font-semibold"
        >
          Username
        </label>
        <input
          id="onb-username"
          type="text"
          value={username}
          autoFocus
          maxLength={30}
          autoComplete="off"
          autoCapitalize="off"
          placeholder="jane-doe"
          onChange={(e) =>
            setUsername(e.target.value.toLowerCase().replace(/\s+/g, "-"))
          }
          className="mt-2 w-full rounded-xl border border-border-base px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-muted">
          Lowercase letters, numbers, hyphens. 3–30 characters.
        </p>
      </div>

      <fieldset>
        <legend className="block text-sm font-semibold">Avatar</legend>
        <p className="mt-1 mb-3 text-xs text-muted">
          Pick one. You can change it later.
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {hasExternalImage && currentImage ? (
            <AvatarOption
              src={currentImage}
              label="Keep current"
              selected={image === currentImage}
              onSelect={() => setImage(currentImage)}
            />
          ) : null}
          {ANIMAL_AVATARS.map((url, i) => (
            <AvatarOption
              key={url}
              src={url}
              label={`Animal ${i + 1}`}
              selected={image === url}
              onSelect={() => setImage(url)}
            />
          ))}
        </div>
      </fieldset>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

function AvatarOption({
  src,
  label,
  selected,
  onSelect,
}: {
  src: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={`relative aspect-square overflow-hidden rounded-full border-2 transition-colors ${
        selected
          ? "border-brand ring-2 ring-brand/30"
          : "border-transparent hover:border-border-base"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </button>
  );
}

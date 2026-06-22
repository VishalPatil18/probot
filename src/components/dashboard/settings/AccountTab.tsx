"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { useDebouncedValue } from "@/lib/client/use-debounced-value";

type Props = {
  name: string;
  email: string;
  username: string;
  image: string | null;
  initials: string;
};

interface FieldAvailability {
  available: boolean;
  reason?: string;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const PASSWORD_ERRORS: Record<string, string> = {
  invalid_current_password: "Your current password is incorrect.",
  no_password_set:
    "Your account uses social sign-in, so there's no password to change.",
  validation_failed: "New password must be at least 8 characters.",
};

// Settings → Account. Editable profile (photo upload, full name, username with a
// debounced availability check) and a password-change form. Each section saves
// independently to its own endpoint; the page is refreshed after a successful
// save so the server-rendered session values re-read.
export function AccountTab({ name, email, username, image, initials }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(image);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(name);
  const [usernameValue, setUsernameValue] = useState(username);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Debounced username availability. The user's own current username is always
  // "available" to them, so only changed values are checked.
  const debouncedUsername = useDebouncedValue(usernameValue, 400);
  const [usernameStatus, setUsernameStatus] =
    useState<FieldAvailability | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (debouncedUsername === username || debouncedUsername.length < 3) {
      setUsernameStatus(null);
      return;
    }
    let cancelled = false;
    setCheckingUsername(true);
    fetch(
      `/api/auth/check-availability?username=${encodeURIComponent(debouncedUsername)}`,
    )
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: { username?: FieldAvailability }) => {
        if (!cancelled) setUsernameStatus(data.username ?? null);
      })
      .catch(() => {
        if (!cancelled) setUsernameStatus(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingUsername(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, username]);

  const usernameTaken = usernameStatus?.available === false;
  const profileDirty = fullName !== name || usernameValue !== username;
  const profileDisabled =
    profileSaving || checkingUsername || usernameTaken || !profileDirty;

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError(null);
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: data,
      });
      if (!res.ok) {
        setAvatarError("Upload failed. Use a JPG, PNG, or WebP under 2 MB.");
        return;
      }
      const payload = (await res.json()) as { image: string };
      setAvatar(payload.image);
      router.refresh();
    } catch {
      setAvatarError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleProfileSave() {
    setProfileError(null);
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      const res = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, username: usernameValue }),
      });
      if (res.status === 409) {
        setProfileError("That username is taken. Pick another.");
        return;
      }
      if (!res.ok) {
        setProfileError(
          "Username must be 3–30 lowercase letters, numbers, or hyphens.",
        );
        return;
      }
      setProfileSaved(true);
      router.refresh();
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPwError(null);
    setPwSaved(false);
    setPwSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setPwError(
          PASSWORD_ERRORS[payload.error ?? ""] ??
            "Could not update password. Please try again.",
        );
        return;
      }
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-5 font-bold">Profile</h3>

        <div className="mb-6 flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt="Your avatar"
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="brand-blue-gradient font-display grid size-16 place-items-center rounded-full text-xl font-extrabold text-white">
              {initials}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary !py-2 text-xs disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <p className="mt-1 text-[11px] text-muted">JPG, PNG, or WebP · 2 MB max</p>
            {avatarError ? (
              <p className="mt-1 text-[11px] text-red-600" role="alert">
                {avatarError}
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="account-name"
              className="mb-1.5 block text-xs font-semibold"
            >
              Full name
            </label>
            <input
              id="account-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              autoComplete="name"
              className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Email</label>
            <div className="w-full rounded-xl border border-border-base bg-neutral-50 px-3 py-2.5 text-sm text-muted">
              {email || "-"}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="account-username"
              className="mb-1.5 block text-xs font-semibold"
            >
              Username
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-border-base bg-white focus-within:border-brand transition-colors">
              <span className="pl-3 pr-1 text-sm text-muted">
                pro-bot.dev/u/
              </span>
              <input
                id="account-username"
                type="text"
                value={usernameValue}
                onChange={(e) =>
                  setUsernameValue(
                    e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  )
                }
                minLength={3}
                maxLength={30}
                autoComplete="username"
                aria-invalid={usernameTaken}
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm outline-none"
              />
            </div>
            {usernameTaken ? (
              <p className="mt-1 text-[11px] text-red-600" role="alert">
                {usernameStatus?.reason}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted">
                3–30 chars · lowercase, numbers, hyphens.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {profileSaved ? (
            <span className="text-xs font-semibold text-emerald-600">
              Saved
            </span>
          ) : null}
          {profileError ? (
            <span className="text-xs text-red-600" role="alert">
              {profileError}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={profileDisabled}
            className="btn btn-primary disabled:opacity-60"
          >
            {profileSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-5 font-bold">Password</h3>
        <form className="space-y-4" onSubmit={handlePasswordSave} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="current-password"
                className="mb-1.5 block text-xs font-semibold"
              >
                Current password
              </label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-xs font-semibold"
              >
                New password
              </label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          {pwError ? (
            <p className="text-xs text-red-600" role="alert">
              {pwError}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            {pwSaved ? (
              <span className="text-xs font-semibold text-emerald-600">
                Password updated
              </span>
            ) : null}
            <button
              type="submit"
              disabled={pwSaving || !currentPassword || newPassword.length < 8}
              className="btn btn-primary disabled:opacity-60"
            >
              {pwSaving ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { isValidThemeColor } from "@/lib/bots/theme-color";

type Props = {
  botId: string;
  initialColor: string;
};

export function ThemeColorPicker({ botId, initialColor }: Props) {
  const router = useRouter();
  const [color, setColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = color.toLowerCase() !== initialColor.toLowerCase();

  async function save() {
    if (!isValidThemeColor(color)) {
      setError("Pick a valid #RRGGBB color.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: color }),
      });
      if (!res.ok) {
        setError("Could not save. Try again.");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border-base bg-white p-5">
      <p className="mb-1 text-sm font-semibold">Theme color</p>
      <p className="mb-3 text-xs text-muted">
        Used by the embeddable widget and email signature badge.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          aria-label="Theme color picker"
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border-base"
        />
        <input
          type="text"
          value={color}
          aria-label="Theme color hex value"
          maxLength={7}
          onChange={(e) => setColor(e.target.value)}
          className="w-28 rounded-lg border border-border-base px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

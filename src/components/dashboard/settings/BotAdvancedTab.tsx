"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MAX_CHARS_DEFAULT,
  PER_DAY_DEFAULT,
  PER_MINUTE_DEFAULT,
} from "@/lib/ai/rate-limit";
import type { Personality } from "@/lib/bots/schemas";
import {
  RATE_LIMIT_MAX_CHARS_MAX,
  RATE_LIMIT_PER_DAY_MAX,
  RATE_LIMIT_PER_MINUTE_MAX,
} from "@/lib/bots/schemas";

import { DeleteBotModal } from "../DeleteBotModal";
import { RateLimitField } from "./fields/RateLimitField";
import { SaveButton } from "./fields/SaveButton";

// Bot Configuration → "Advanced" tab. Hosts the three sections that live
// alongside the primary bot fields but aren't part of the day-to-day
// persona/theme/knowledge editor:
//   - Rate limits (per-minute, per-day, max chars per message)
//   - Save-as-preset (snapshots the currently-persisted config into a
//     reusable preset row)
//   - Danger zone (delete this bot)
//
// The preset snapshot pulls from the `initial*` props (i.e. the last
// values persisted to `bots`), so any unsaved edits in the Bot
// Configuration tab do NOT leak into the preset. That's a deliberate
// contract: a preset should always describe a shape that already exists
// on the server.

type SectionKey = "limits";

type Props = {
  botId: string;
  botName: string;
  // Snapshot fields for the preset save. These are the last-committed
  // values from the DB; they seed the preset payload without the tab
  // needing to know how the Bot Config tab's in-flight edits are
  // structured.
  initialName: string;
  initialHeadline: string;
  initialPersonality: Personality;
  initialSuggestedQuestions: string[];
  initialThemeColor: string;
  initialCustomInstructions: string;
  initialRateLimitPerMinute: number | null;
  initialRateLimitPerDay: number | null;
  initialRateLimitMaxChars: number | null;
};

export function BotAdvancedTab({
  botId,
  botName,
  initialName,
  initialHeadline,
  initialPersonality,
  initialSuggestedQuestions,
  initialThemeColor,
  initialCustomInstructions,
  initialRateLimitPerMinute,
  initialRateLimitPerDay,
  initialRateLimitMaxChars,
}: Props) {
  const router = useRouter();

  const [rateLimitPerMinute, setRateLimitPerMinute] = useState<string>(
    initialRateLimitPerMinute === null ? "" : String(initialRateLimitPerMinute),
  );
  const [rateLimitPerDay, setRateLimitPerDay] = useState<string>(
    initialRateLimitPerDay === null ? "" : String(initialRateLimitPerDay),
  );
  const [rateLimitMaxChars, setRateLimitMaxChars] = useState<string>(
    initialRateLimitMaxChars === null ? "" : String(initialRateLimitMaxChars),
  );
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null);
  const [sectionError, setSectionError] = useState<{
    key: SectionKey;
    msg: string;
  } | null>(null);

  const [presetName, setPresetName] = useState(initialName);
  const [presetStatus, setPresetStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (savedSection === null) return;
    const t = setTimeout(() => setSavedSection(null), 1500);
    return () => clearTimeout(t);
  }, [savedSection]);

  const limitsDirty =
    rateLimitPerMinute !==
      (initialRateLimitPerMinute === null
        ? ""
        : String(initialRateLimitPerMinute)) ||
    rateLimitPerDay !==
      (initialRateLimitPerDay === null
        ? ""
        : String(initialRateLimitPerDay)) ||
    rateLimitMaxChars !==
      (initialRateLimitMaxChars === null
        ? ""
        : String(initialRateLimitMaxChars));

  function parseLimitField(
    raw: string,
    max: number,
  ): { ok: true; value: number | null } | { ok: false; reason: string } {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return { ok: true, value: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        reason: "Rate limits must be positive whole numbers (or blank).",
      };
    }
    if (n > max) {
      return {
        ok: false,
        reason: `Rate limits cap at ${max.toLocaleString()}.`,
      };
    }
    return { ok: true, value: n };
  }

  async function saveLimits() {
    if (!limitsDirty || savingSection) return;
    const perMinute = parseLimitField(
      rateLimitPerMinute,
      RATE_LIMIT_PER_MINUTE_MAX,
    );
    const perDay = parseLimitField(rateLimitPerDay, RATE_LIMIT_PER_DAY_MAX);
    const maxChars = parseLimitField(
      rateLimitMaxChars,
      RATE_LIMIT_MAX_CHARS_MAX,
    );
    if (!perMinute.ok) {
      setSectionError({ key: "limits", msg: perMinute.reason });
      return;
    }
    if (!perDay.ok) {
      setSectionError({ key: "limits", msg: perDay.reason });
      return;
    }
    if (!maxChars.ok) {
      setSectionError({ key: "limits", msg: maxChars.reason });
      return;
    }
    const patch: Record<string, unknown> = {};
    if (perMinute.value !== initialRateLimitPerMinute) {
      patch.rateLimitPerMinute = perMinute.value;
    }
    if (perDay.value !== initialRateLimitPerDay) {
      patch.rateLimitPerDay = perDay.value;
    }
    if (maxChars.value !== initialRateLimitMaxChars) {
      patch.rateLimitMaxChars = maxChars.value;
    }
    if (Object.keys(patch).length === 0) {
      setSectionError(null);
      setSavedSection("limits");
      return;
    }
    setSavingSection("limits");
    setSectionError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setSectionError({
          key: "limits",
          msg: "Couldn't save changes. Please try again.",
        });
        return;
      }
      setSavedSection("limits");
      router.refresh();
    } catch {
      setSectionError({ key: "limits", msg: "Network error. Please try again." });
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveAsPreset() {
    const trimmed = presetName.trim();
    if (trimmed.length === 0 || presetStatus === "saving") return;
    setPresetStatus("saving");
    try {
      const res = await fetch("/api/bot-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          settings: {
            name: initialName,
            headline: initialHeadline,
            personality: initialPersonality,
            suggestedQuestions: initialSuggestedQuestions,
            themeColor: initialThemeColor,
            customInstructions: initialCustomInstructions,
            rateLimitPerMinute,
            rateLimitPerDay,
            rateLimitMaxChars,
          },
        }),
      });
      setPresetStatus(res.ok ? "saved" : "error");
    } catch {
      setPresetStatus("error");
    }
  }

  async function handleDeleteBot() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Couldn't delete this bot. Please try again.");
        return;
      }
      setDeleteOpen(false);
      router.push("/dashboard/bots/new");
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Rate limits</h3>
        <p className="mb-5 text-xs text-muted">
          Protect your LLM credits. Blank = use the server default. Limits
          apply per bot, not per recruiter.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <RateLimitField
            label="Per minute"
            placeholderDefault={PER_MINUTE_DEFAULT}
            value={rateLimitPerMinute}
            onChange={setRateLimitPerMinute}
            max={RATE_LIMIT_PER_MINUTE_MAX}
          />
          <RateLimitField
            label="Per day"
            placeholderDefault={PER_DAY_DEFAULT}
            value={rateLimitPerDay}
            onChange={setRateLimitPerDay}
            max={RATE_LIMIT_PER_DAY_MAX}
          />
          <RateLimitField
            label="Max chars / message"
            placeholderDefault={MAX_CHARS_DEFAULT}
            value={rateLimitMaxChars}
            onChange={setRateLimitMaxChars}
            max={RATE_LIMIT_MAX_CHARS_MAX}
          />
        </div>
        <SaveButton
          dirty={limitsDirty}
          saving={savingSection === "limits"}
          saved={savedSection === "limits"}
          error={sectionError?.key === "limits" ? sectionError.msg : null}
          onClick={saveLimits}
        />
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Save as a preset</h3>
        <p className="mb-4 text-xs text-muted">
          Save this bot&apos;s configuration as a reusable preset (no keys or
          secrets are stored). Reuse it when creating a new bot. Snapshots
          the last-saved values plus the rate limits above.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={presetName}
            onChange={(e) => {
              setPresetName(e.target.value);
              setPresetStatus("idle");
            }}
            maxLength={80}
            placeholder="Preset name"
            className="min-w-[200px] flex-1 rounded-lg border border-border-base px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveAsPreset}
            disabled={presetStatus === "saving" || presetName.trim().length === 0}
            className="btn btn-secondary disabled:opacity-60"
          >
            {presetStatus === "saving" ? "Saving…" : "Save as preset"}
          </button>
          {presetStatus === "saved" ? (
            <span className="text-sm font-medium text-emerald-700">Saved!</span>
          ) : null}
          {presetStatus === "error" ? (
            <span className="text-sm font-medium text-rose-700">
              Couldn&apos;t save
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold text-rose-600">Danger zone</h3>
        <p className="mb-4 text-xs text-muted">
          Permanently deletes this bot, its knowledge base, conversations,
          leads, and any stored encrypted key. You can create a new bot
          afterwards. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn border border-rose-200 !bg-rose-50 !text-rose-600 hover:!bg-rose-100"
        >
          Delete this bot
        </button>
      </section>

      <DeleteBotModal
        botName={botName}
        open={deleteOpen}
        busy={deleting}
        error={deleteError}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteBot}
      />
    </div>
  );
}

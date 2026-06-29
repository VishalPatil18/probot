"use client";

import { BotAvatarPreview } from "../parts/BotAvatarPreview";
import { StepHeading } from "../parts/StepHeading";
import type { FormState, PatchFn } from "../types";

export function StepIdentity({
  form,
  patch,
  username,
}: {
  form: FormState;
  patch: PatchFn;
  username: string;
}) {
  return (
    <section>
      <StepHeading
        step={1}
        title="Who is your bot?"
        subtitle="This is how you'll appear to recruiters."
      />
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold mb-1.5">
            Bot picture
          </label>
          <div className="flex items-center gap-4">
            <BotAvatarPreview file={form.botImageFile} />
            <div>
              <label
                htmlFor="bf-avatar"
                className="btn btn-secondary !py-2 inline-block cursor-pointer text-xs"
              >
                {form.botImageFile ? "Change picture" : "Upload picture"}
                <input
                  id="bf-avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) patch("botImageFile", file);
                  }}
                />
              </label>
              {form.botImageFile ? (
                <button
                  type="button"
                  onClick={() => patch("botImageFile", null)}
                  className="ml-2 text-xs text-muted hover:text-error"
                >
                  Remove
                </button>
              ) : null}
              <p className="mt-1 text-[11px] text-muted">
                Defaults to the ProBot icon · JPG/PNG/WebP · 2 MB
              </p>
            </div>
          </div>
        </div>
        <div>
          <label
            htmlFor="bf-name"
            className="block text-xs font-semibold mb-1.5"
          >
            Display name
          </label>
          <input
            id="bf-name"
            type="text"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            maxLength={100}
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="bf-headline"
            className="block text-xs font-semibold mb-1.5"
          >
            Headline{" "}
            <span className="text-muted font-normal">· max 120 chars</span>
          </label>
          <input
            id="bf-headline"
            type="text"
            value={form.headline}
            onChange={(e) => patch("headline", e.target.value)}
            maxLength={120}
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Bot URL</label>
          <div className="flex items-center border border-border-base rounded-xl overflow-hidden bg-neutral-50">
            <span className="pl-3 pr-1 text-sm text-muted">pro-bot.dev/u/</span>
            <span className="flex-1 py-2.5 pr-3 text-sm font-mono">
              {username}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Slug comes from your username.
          </p>
        </div>
      </div>
    </section>
  );
}

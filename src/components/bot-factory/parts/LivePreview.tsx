"use client";

import type { FormState } from "../types";
import { BotAvatarPreview } from "./BotAvatarPreview";

export function LivePreview({ form }: { form: FormState }) {
  const name = form.name.trim() || "Your name";
  const headline = form.headline.trim();
  const themeStyle = {
    ["--bot-accent" as string]: form.themeColor,
  } as React.CSSProperties;

  return (
    <div
      className="hidden lg:flex border-l border-border-base bg-bg-app flex-col items-center justify-center p-8 lg:overflow-y-auto"
      style={themeStyle}
    >
      <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted">
        Live preview
      </p>

      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-border-base bg-white shadow-floating">
        <header className="border-b border-border-base bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative shrink-0">
              <span
                className="block rounded-full ring-2 ring-offset-2 ring-offset-white"
                style={{ boxShadow: `0 0 0 2px ${form.themeColor}` }}
              >
                <BotAvatarPreview
                  file={form.botImageFile}
                  sizeClass="size-10"
                  themeColor={form.themeColor}
                />
              </span>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-base font-bold leading-tight">
                {name}{" "}
                <span className="font-sans text-xs font-normal text-muted">
                  · AI Assistant
                </span>
              </h3>
              {headline.length > 0 ? (
                <p className="truncate text-[11px] text-muted">{headline}</p>
              ) : (
                <p className="text-[11px] font-medium text-emerald-600">
                  Online now
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-[220px] space-y-3 bg-bg-app/50 px-4 py-4">
          <div className="flex gap-2.5">
            <BotAvatarPreview
              file={form.botImageFile}
              sizeClass="size-7"
              themeColor={form.themeColor}
            />
            <div
              className="max-w-[85%] rounded-2xl rounded-tl-md border border-border-base bg-white px-3 py-2 text-xs leading-relaxed shadow-soft"
            >
              Hi! I&apos;m {name}. Ask me anything.
            </div>
          </div>
        </div>

        <div className="border-t border-border-base bg-white/90 backdrop-blur">
          <div className="space-y-2.5 px-4 py-3">
            {form.suggestedQuestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {form.suggestedQuestions.map((q, i) => (
                  <button
                    key={`${q}-${i}`}
                    type="button"
                    disabled
                    className="rounded-full border border-border-base bg-white px-2.5 py-1 text-[11px] font-medium text-ink shadow-soft"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 rounded-2xl border border-border-base bg-white px-2 py-1.5"
            >
              <span className="flex-1 truncate py-1 text-[11px] text-muted">
                Ask anything about {name}…
              </span>
              <button
                type="button"
                disabled
                aria-label="Send"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                style={{ background: form.themeColor }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-[300px] text-center text-xs text-muted">
        Updates as you type.
      </p>
    </div>
  );
}

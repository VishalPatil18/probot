"use client";

import type { FormState } from "../types";
import { BotAvatarPreview } from "./BotAvatarPreview";

export function LivePreview({ form }: { form: FormState }) {
  const name = form.name.trim() || "Your name";
  const headline = form.headline.trim() || "Your headline";

  return (
    // `lg:overflow-y-auto` - internal scroll if the preview card ever
    // grows past the column's available height (Bot Factory wrapper is
    // fixed at `lg:h-full`, so each grid column gets its own scroll).
    <div className="hidden lg:flex border-l border-border-base bg-white flex-col items-center justify-center p-8 lg:overflow-y-auto">
      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">
        Live preview
      </p>
      <div className="w-full max-w-[340px] bg-white rounded-2xl border border-border-base shadow-floating overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-base">
          <BotAvatarPreview
            file={form.botImageFile}
            sizeClass="size-10"
            themeColor={form.themeColor}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{name}</p>
            <p className="text-[11px] text-muted truncate">{headline}</p>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2.5 bg-bg-app/40 min-h-[180px]">
          <div className="px-3 py-2 text-xs rounded-2xl bg-neutral-100 w-fit max-w-[85%]">
            👋 Hi! Ask me anything.
          </div>
          {form.suggestedQuestions.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5 pt-1">
              {form.suggestedQuestions.map((q, i) => (
                <span
                  key={`${q}-${i}`}
                  className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: form.themeColor, color: form.themeColor }}
                >
                  {q}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="px-4 py-3 border-t border-border-base flex items-center gap-2">
          <span className="text-xs text-muted flex-1">Ask anything…</span>
          <span
            className="size-7 shrink-0 rounded-lg"
            style={{ background: form.themeColor }}
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="text-xs text-muted mt-4 text-center max-w-[300px]">
        Updates as you type.
      </p>
    </div>
  );
}

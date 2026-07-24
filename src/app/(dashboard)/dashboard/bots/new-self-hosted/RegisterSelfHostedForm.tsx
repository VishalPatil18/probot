"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterSelfHostedForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [tokenName, setTokenName] = useState("Default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [minted, setMinted] = useState<{
    botId: string;
    token: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bots/self-hosted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(headline.trim().length > 0 ? { headline: headline.trim() } : {}),
          tokenName: tokenName.trim() || "Default",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Could not register your bot.");
        return;
      }
      const data = (await res.json()) as {
        bot: { id: string };
        token: { rawToken: string };
      };
      setMinted({ botId: data.bot.id, token: data.token.rawToken });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (minted) {
    return (
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-2">
          Self-hosted bot
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">
          Bot registered 🚀
        </h1>
        <p className="text-muted text-sm mb-8">
          Copy the token now — this is the only time it&apos;s shown. Drop it into
          your webapp&apos;s <code>dashboard.token</code> config for the{" "}
          <code>probot-self-hosted</code> package.
        </p>
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-success/10 border-success/20">
            <span aria-hidden>✓</span>
            <div>
              <p className="text-sm font-bold">Bot registered</p>
              <p className="text-xs text-muted">
                You can revoke or rotate this token anytime from bot settings.
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Bot token
            </label>
            <div className="mt-1.5 rounded-xl bg-neutral-900 p-4 ring-1 ring-white/10">
              <div className="flex items-start gap-2">
                <pre className="flex-1 min-w-0 overflow-x-auto font-mono text-xs leading-relaxed text-neutral-100">
                  <code className="break-all whitespace-pre-wrap">
                    {minted.token}
                  </code>
                </pre>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(minted.token);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    } catch {
                    }
                  }}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-white/10"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Shown once. If you lose it, register the bot again to mint a new
              token.
            </p>
          </div>

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-base">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(minted.token);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                } catch {
                }
              }}
              className="btn btn-secondary"
            >
              Copy token
            </button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard`)}
              className="btn btn-primary !px-6"
            >
              Open dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-2">
        Register a self-hosted bot
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">
        Give your bot a name.
      </h1>
      <p className="text-muted text-sm mb-8">
        We&apos;ll create the dashboard entry and mint your first token. Persona,
        knowledge, provider, and theme all live in your webapp&apos;s{" "}
        <code>probot-self-hosted</code> config.
      </p>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label
            htmlFor="sh-name"
            className="block text-xs font-semibold mb-1.5"
          >
            Bot name
          </label>
          <input
            id="sh-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="Ada's assistant"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="sh-headline"
            className="block text-xs font-semibold mb-1.5"
          >
            Headline{" "}
            <span className="text-muted font-normal">· optional · max 120 chars</span>
          </label>
          <input
            id="sh-headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={120}
            placeholder="Ask me about my work"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="sh-token-label"
            className="block text-xs font-semibold mb-1.5"
          >
            Token label
          </label>
          <input
            id="sh-token-label"
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Production"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
          <p className="text-[11px] text-muted mt-1.5">
            Used to identify this token in the dashboard when you want to revoke
            it later.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-base">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || name.trim().length === 0}
            className="btn btn-primary !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Registering…" : "Register bot"}
          </button>
        </div>
      </form>
    </section>
  );
}

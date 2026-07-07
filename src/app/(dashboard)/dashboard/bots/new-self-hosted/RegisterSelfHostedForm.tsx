"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Client half of the self-hosted register page. POSTs to /api/bots/self-hosted,
// shows the minted token exactly once (raw secret can never be retrieved
// again), then routes to Settings → Deployment where the owner can mint
// additional tokens or revoke this one.
export function RegisterSelfHostedForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [tokenName, setTokenName] = useState("Default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      <div className="space-y-5">
        <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <h2 className="font-bold text-lg">Your bot is registered.</h2>
          <p className="mt-1 text-sm text-muted">
            Copy the token now - this is the only time it&apos;s shown. Drop it
            into your webapp&apos;s <code>dashboard.token</code> config for the{" "}
            <code>probot-self-hosted</code> package.
          </p>
          <code className="mt-4 block break-all rounded-lg bg-neutral-900 px-3 py-2 text-xs text-neutral-100">
            {minted.token}
          </code>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(minted.token);
              } catch {
                // clipboard may be unavailable; the value is selectable above
              }
            }}
            className="btn btn-secondary"
          >
            Copy token
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/bots/${minted.botId}/settings?tab=deploy`)
            }
            className="btn btn-primary"
          >
            Open dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="block text-sm font-semibold mb-1.5">Bot name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="Ada's assistant"
          className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1.5">
          Headline{" "}
          <span className="text-xs font-normal text-muted">(optional)</span>
        </span>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          placeholder="Ask me about my work"
          className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold mb-1.5">Token label</span>
        <input
          type="text"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Production"
          className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand"
        />
        <span className="mt-1 block text-[11px] text-muted">
          Used to identify this token in the dashboard when you want to revoke
          it later.
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || name.trim().length === 0}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {busy ? "Registering…" : "Register bot"}
      </button>
    </form>
  );
}

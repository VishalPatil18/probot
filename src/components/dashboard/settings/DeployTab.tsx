"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Deployment" settings tab. Mode is decided at creation and is no longer
// switchable here - managed bots come from Bot Factory, self-hosted bots
// from the dedicated Register flow. This tab therefore renders one of two
// panels based on the bot's persisted mode:
//   - managed: read-only status card + embed/docs links (no tokens).
//   - self_hosted: token management (mint / list / revoke) + npm package
//     integration snippet + link to the setup guide.

export type DeploymentMode = "managed" | "self_hosted";

export interface DeployTokenView {
  id: string;
  name: string;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface DeployTabProps {
  botId: string;
  botName: string;
  ownerUsername: string;
  mode: DeploymentMode;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString();
}

export function DeployTab({
  botId,
  botName,
  ownerUsername,
  mode,
}: DeployTabProps) {
  if (mode === "managed") return <ManagedPanel ownerUsername={ownerUsername} />;
  return <SelfHostedPanel botId={botId} botName={botName} />;
}

function ManagedPanel({ ownerUsername }: { ownerUsername: string }) {
  return (
    <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
      <h3 className="font-bold">Managed by pro-bot.dev</h3>
      <p className="mt-1 text-sm text-muted">
        This bot&apos;s chat runs on the ProBot platform at{" "}
        <code>pro-bot.dev/u/{ownerUsername}/chat</code> and via the embed
        widget. Persona, knowledge, and provider live in the other Settings
        tabs.
      </p>
      <p className="mt-3 text-sm text-muted">
        Want the chat to run entirely inside your own webapp? Register a{" "}
        <Link
          href="/dashboard/bots/new-self-hosted"
          className="text-brand font-semibold hover:underline"
        >
          self-hosted bot
        </Link>{" "}
        instead - it uses the{" "}
        <a
          href="https://www.npmjs.com/package/probot-self-hosted"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-semibold hover:underline"
        >
          probot-self-hosted
        </a>{" "}
        npm package and keeps your LLM key entirely in your infrastructure.
      </p>
    </section>
  );
}

function SelfHostedPanel({ botId, botName }: { botId: string; botName: string }) {
  const [tokens, setTokens] = useState<DeployTokenView[]>([]);
  const [newName, setNewName] = useState("");
  const [mintedSecret, setMintedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bots/${botId}/tokens`);
        if (!res.ok) return;
        const data: { tokens?: DeployTokenView[] } = await res.json();
        if (!cancelled) setTokens(data.tokens ?? []);
      } catch {
        // non-fatal: the owner can still mint a token
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  async function mintToken() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/tokens`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Could not generate a token.");
      const data: { id: string; name: string; token: string } =
        await res.json();
      setMintedSecret(data.token);
      setTokens((prev) => [
        {
          id: data.id,
          name: data.name,
          lastSeenAt: null,
          createdAt: new Date().toISOString(),
          revokedAt: null,
        },
        ...prev,
      ]);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken(tokenId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/tokens/${tokenId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not revoke the token.");
      setTokens((prev) =>
        prev.map((t) =>
          t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="font-bold">Self-hosted bot</h3>
        <p className="mt-1 text-sm text-muted">
          Configuration for this bot - persona, knowledge, provider, theme -
          lives in your web application, using the{" "}
          <a
            href="https://www.npmjs.com/package/probot-self-hosted"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            probot-self-hosted
          </a>{" "}
          npm package. This dashboard shows conversations and leads for
          analytics only.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 px-3 py-2 text-xs text-neutral-100">
          {`npm i probot-self-hosted

import { ProbotBot } from "probot-self-hosted";

<ProbotBot
  name="${botName.replace(/"/g, '\\"')}"
  sendMessage={/* your server proxy */}
  dashboard={{ token: process.env.NEXT_PUBLIC_PROBOT_TOKEN! }}
/>`}
        </pre>
        <p className="mt-3 text-xs text-muted">
          Full setup, framework examples, and API reference:{" "}
          <a
            href="https://pro-bot.dev/docs/self-hosted-bot/index"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            self-hosted bot docs
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="font-bold">Bot tokens</h3>
        <p className="mt-1 text-sm text-muted">
          Passed to the widget as <code>dashboard.token</code>. Every token
          grants conversation and lead writes for this bot only - revoke it to
          cut a deployment off instantly.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[200px] text-sm">
            <span className="font-medium">Token name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Production"
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-border-base px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={mintToken}
            disabled={busy || newName.trim().length === 0}
            className="btn btn-primary"
          >
            Generate token
          </button>
        </div>

        {tokens.length > 0 ? (
          <ul className="mt-5 divide-y divide-border-base">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.name}{" "}
                    {t.revokedAt ? (
                      <span className="ml-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        Revoked
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    Last seen {formatWhen(t.lastSeenAt)}
                  </p>
                </div>
                {!t.revokedAt ? (
                  <button
                    type="button"
                    onClick={() => revokeToken(t.id)}
                    disabled={busy}
                    className="text-sm font-semibold text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-muted">No tokens yet.</p>
        )}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {mintedSecret ? (
        <MintedTokenModal
          secret={mintedSecret}
          onClose={() => setMintedSecret(null)}
        />
      ) : null}
    </div>
  );
}

function MintedTokenModal({
  secret,
  onClose,
}: {
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New bot token"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold">Copy your token now</h3>
        <p className="mt-1 text-sm text-muted">
          This is the only time the full token is shown. Store it somewhere
          safe - you can&apos;t see it again.
        </p>
        <code className="mt-4 block break-all rounded-lg bg-neutral-900 px-3 py-2 text-xs text-neutral-100">
          {secret}
        </code>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(secret);
                setCopied(true);
              } catch {
                // clipboard may be unavailable; the value is selectable above
              }
            }}
            className="btn btn-secondary"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

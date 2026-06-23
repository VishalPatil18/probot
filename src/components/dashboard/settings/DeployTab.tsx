"use client";

import { useEffect, useState } from "react";

// Stage 9 "Deployment" settings tab. Lets an owner switch a bot between the
// managed runtime (served by this platform) and self-hosted (their own
// `probot-bot` runtime), and manage the API tokens that runtime uses. Minting
// a token shows the raw secret exactly once; the list afterwards shows only
// metadata (name, last seen) with a revoke action.

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
  ownerUsername: string;
  initialMode: DeploymentMode;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString();
}

export function DeployTab({
  botId,
  ownerUsername,
  initialMode,
}: DeployTabProps) {
  const [mode, setMode] = useState<DeploymentMode>(initialMode);
  const [tokens, setTokens] = useState<DeployTokenView[]>([]);
  const [newName, setNewName] = useState("");
  const [mintedSecret, setMintedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the token list once the tab mounts. Inactive settings panels don't
  // render (SettingsTabPanel only mounts the active key), so this fetch only
  // fires when the owner actually opens the Deployment tab.
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

  async function switchMode(next: DeploymentMode) {
    if (next === mode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/deployment`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deploymentMode: next }),
      });
      if (!res.ok) throw new Error("Could not update deployment mode.");
      setMode(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

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
        <h3 className="font-bold">Deployment mode</h3>
        <p className="mt-1 text-sm text-muted">
          Choose where this bot&apos;s chat runs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "managed"}
            disabled={busy}
            onClick={() => switchMode("managed")}
            title="Managed"
            body={`Served here at pro-bot.dev/u/${ownerUsername}/chat and via the embed widget. Nothing to deploy.`}
          />
          <ModeCard
            active={mode === "self_hosted"}
            disabled={busy}
            onClick={() => switchMode("self_hosted")}
            title="Self-hosted"
            body="Run the probot-bot runtime on your own infrastructure; it talks to the platform over /api/v1/bot/* with a token."
          />
        </div>
      </section>

      {mode === "self_hosted" ? (
        <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <h3 className="font-bold">Bot tokens</h3>
          <p className="mt-1 text-sm text-muted">
            Your self-hosted runtime authenticates with one of these. Drop it
            into the runtime&apos;s <code>PROBOT_BOT_TOKEN</code> env var. See the{" "}
            <a
              href="https://pro-bot.dev/docs/self-hosted-bot/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-semibold hover:underline"
            >
              setup guide
            </a>
            .
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px] text-sm">
              <span className="font-medium">Token name</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Vercel production"
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
      ) : null}

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

function ModeCard({
  active,
  disabled,
  onClick,
  title,
  body,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active
          ? "border-brand bg-blue-50"
          : "border-border-base bg-white hover:bg-neutral-50"
      }`}
    >
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-xs text-muted">{body}</span>
    </button>
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

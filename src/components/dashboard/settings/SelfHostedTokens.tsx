"use client";

import { useCallback, useEffect, useState } from "react";

import { formatRelative, formatTimestamp } from "./audit";

type TokenView = {
  id: string;
  name: string;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type Props = {
  botId: string;
};

export function SelfHostedTokens({ botId }: Props) {
  const [tokens, setTokens] = useState<TokenView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState("New token");
  const [generating, setGenerating] = useState(false);
  const [minted, setMinted] = useState<{ id: string; rawToken: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/tokens`);
      if (!res.ok) {
        setLoadError("Couldn't load tokens.");
        return;
      }
      const body = (await res.json()) as { tokens: TokenView[] };
      setTokens(body.tokens);
      setLoadError(null);
    } catch {
      setLoadError("Network error loading tokens.");
    }
  }, [botId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate() {
    const name = newName.trim();
    if (generating || name.length === 0) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setGenError("Couldn't generate a token. Please try again.");
        return;
      }
      const body = (await res.json()) as {
        token: { id: string; rawToken: string };
      };
      setMinted(body.token);
      setNewName("New token");
      await refresh();
    } catch {
      setGenError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(tokenId: string) {
    if (revokingId) return;
    if (
      !confirm(
        "Revoke this token? Any app using it will stop working immediately.",
      )
    ) {
      return;
    }
    setRevokingId(tokenId);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/tokens/${tokenId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setRevokeError("Couldn't revoke the token. Please try again.");
        return;
      }
      await refresh();
    } catch {
      setRevokeError("Network error. Please try again.");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyMinted() {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted.rawToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }

  return (
    <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
      <h3 className="mb-1 font-bold">Access tokens</h3>
      <p className="mb-5 text-xs text-muted">
        Your self-hosted runtime authenticates to ProBot with a bearer token.
        Generate a new one to rotate, and revoke any token that leaks. Tokens
        are shown once at creation.
      </p>

      {minted ? (
        <div className="mb-5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            New token - copy it now
          </label>
          <div className="mt-1.5 rounded-xl bg-neutral-900 p-4 ring-1 ring-white/10">
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-neutral-100">
                <code className="whitespace-pre-wrap break-all">
                  {minted.rawToken}
                </code>
              </pre>
              <button
                type="button"
                onClick={copyMinted}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-white/10"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">
              Shown once. Drop it into your app&apos;s{" "}
              <code>dashboard.token</code> config.
            </p>
            <button
              type="button"
              onClick={() => setMinted(null)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <p role="alert" className="mb-3 text-xs text-rose-700">
          {loadError}
        </p>
      ) : tokens === null ? (
        <p className="text-xs text-muted">Loading tokens…</p>
      ) : tokens.length === 0 ? (
        <p className="mb-5 text-xs text-muted">No tokens yet.</p>
      ) : (
        <ul className="mb-5 divide-y divide-border-base rounded-xl border border-border-base">
          {tokens.map((t) => {
            const revoked = t.revokedAt !== null;
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-sm font-semibold ${
                        revoked ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        revoked
                          ? "bg-neutral-100 text-neutral-500"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {revoked ? "Revoked" : "Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Created {formatTimestamp(t.createdAt)} ·{" "}
                    {t.lastSeenAt
                      ? `last used ${formatRelative(t.lastSeenAt)}`
                      : "never used"}
                  </p>
                </div>
                {revoked ? null : (
                  <button
                    type="button"
                    onClick={() => void revoke(t.id)}
                    disabled={revokingId === t.id}
                    className="shrink-0 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                  >
                    {revokingId === t.id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {revokeError ? (
        <p role="alert" className="mb-3 text-xs text-rose-700">
          {revokeError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="new-token-name"
            className="mb-1.5 block text-xs font-semibold"
          >
            New token label
          </label>
          <input
            id="new-token-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Production"
            className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating || newName.trim().length === 0}
          className="btn btn-primary disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate new token"}
        </button>
      </div>
      {genError ? (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {genError}
        </p>
      ) : null}
    </section>
  );
}

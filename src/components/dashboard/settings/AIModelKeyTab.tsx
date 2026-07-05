"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MODEL_OPTIONS } from "@/lib/ai/model-options";
import { describeProvider, PROVIDER_LABELS } from "@/lib/ai/provider-labels";
import type { ProviderName } from "@/lib/ai/providers";
import { PROVIDER_NAMES } from "@/lib/ai/providers";
import {
  getApiKey,
  getAzureCreds,
  setApiKey,
  setAzureCreds,
} from "@/lib/client/llm-key-store";
import { DEFAULT_AZURE_API_VERSION } from "@/components/bot-factory/constants";

import { type AuditResponse, formatTimestamp } from "./audit";
import { ManagedKeyStatusPill } from "./ManagedKeyStatusPill";

type Props = {
  // Null on the account-only /dashboard/settings route (no bot yet). The
  // provider/model switcher (user-level) still works; the per-bot managed-key
  // + audit sections are hidden until a bot exists.
  botId: string | null;
  provider: string | null;
  model: string | null;
};

// The AI model & key tab is live.
//
// Three controls:
//   1. Provider + model switcher (writes to users.llm_provider /
//      users.llm_model via PATCH /api/users/me/llm-prefs).
//   2. Managed-key storage panel (POST/DELETE /api/bots/[botId]/llm-key).
//      The plaintext key goes from this form straight to envelope encryption
//      server-side; nothing is logged. On revoke, the encrypted row is
//      deleted - recruiters can no longer reach the bot via the managed
//      path until the creator stores a fresh key.
//   3. Decrypt audit log (last 30 days) showing when the managed key was
//      used and a short hash suffix of the requester IP.
//
// Provider/model preferences live on the USER (one provider per account, as
// the existing onboarding flow assumes); managed key + audit log are per-BOT
// since a future multi-bot user may want to scope keys per bot.

export function AIModelKeyTab({
  botId,
  provider: initialProvider,
  model: initialModel,
}: Props) {
  const router = useRouter();

  const [provider, setProvider] = useState<ProviderName>(
    isProviderName(initialProvider) ? initialProvider : "anthropic",
  );
  const [model, setModel] = useState<string>(initialModel ?? "");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsStatus, setPrefsStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const [managedKey, setManagedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [storingKey, setStoringKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "stored" | "error">(
    "idle",
  );
  const [keyError, setKeyError] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Azure credentials live in the browser's encrypted IndexedDB store - Azure's
  // multi-secret credential (key + endpoint + apiVersion) isn't wired into the
  // server-side managed-key path. This mirrors Bot Factory Step 4 so owners can
  // update the same three values from Settings without re-running the wizard.
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureApiVersion, setAzureApiVersion] = useState(
    DEFAULT_AZURE_API_VERSION,
  );
  const [azureKey, setAzureKey] = useState("");
  const [azureKeyStored, setAzureKeyStored] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [savingAzure, setSavingAzure] = useState(false);
  const [azureStatus, setAzureStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [azureError, setAzureError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    if (!botId) return;
    try {
      const res = await fetch(`/api/bots/${botId}/llm-key/audit`);
      if (!res.ok) {
        setAuditError("Couldn't load managed-key status.");
        return;
      }
      const body = (await res.json()) as AuditResponse;
      setAudit(body);
      setAuditError(null);
    } catch {
      setAuditError("Network error loading managed-key status.");
    }
  }, [botId]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  // Pre-fill the Azure form from the encrypted browser store when the tab
  // opens on Azure (or when the user flips the provider to Azure). Only the
  // endpoint + apiVersion round-trip visibly; the key is masked with a
  // placeholder if one is already stored (same UX as the managed-key input).
  useEffect(() => {
    if (provider !== "azure") return;
    let cancelled = false;
    void (async () => {
      try {
        const [creds, existingKey] = await Promise.all([
          getAzureCreds(),
          getApiKey(),
        ]);
        if (cancelled) return;
        if (creds) {
          setAzureEndpoint(creds.endpoint);
          setAzureApiVersion(creds.apiVersion || DEFAULT_AZURE_API_VERSION);
        }
        setAzureKeyStored(Boolean(existingKey && existingKey.length > 0));
      } catch {
        // Non-fatal - the user can still type new credentials in.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  async function saveAzureCreds() {
    if (savingAzure) return;
    const endpoint = azureEndpoint.trim();
    const apiVersion = azureApiVersion.trim() || DEFAULT_AZURE_API_VERSION;
    const keyInput = azureKey.trim();
    if (!endpoint.startsWith("https://")) {
      setAzureStatus("error");
      setAzureError("Endpoint must start with https://");
      return;
    }
    // Key required only when nothing has been stored yet - blank means
    // "keep the existing one" on a settings update.
    if (!azureKeyStored && keyInput.length < 8) {
      setAzureStatus("error");
      setAzureError("API key must be at least 8 characters.");
      return;
    }
    setSavingAzure(true);
    setAzureError(null);
    try {
      await setAzureCreds({ endpoint, apiVersion });
      if (keyInput.length >= 8) {
        await setApiKey(keyInput);
      }
      setAzureKey("");
      setAzureKeyStored(true);
      setAzureStatus("saved");
    } catch {
      setAzureStatus("error");
      setAzureError("Couldn't save credentials. Please try again.");
    } finally {
      setSavingAzure(false);
    }
  }

  function selectProvider(next: ProviderName) {
    setProvider(next);
    // Reset to first available model when provider changes (Azure has no
    // dropdown - deployment name is free-text, handled by onboarding).
    const list = MODEL_OPTIONS[next];
    setModel(next === "azure" ? "" : (list[0] ?? ""));
    setPrefsStatus("idle");
  }

  async function savePrefs() {
    if (savingPrefs) return;
    setSavingPrefs(true);
    setPrefsError(null);
    try {
      const res = await fetch("/api/users/me/llm-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmProvider: provider,
          llmModel: model.trim().length > 0 ? model.trim() : null,
        }),
      });
      if (!res.ok) {
        setPrefsStatus("error");
        setPrefsError("Couldn't save provider/model. Please try again.");
        return;
      }
      setPrefsStatus("saved");
      router.refresh();
    } catch {
      setPrefsStatus("error");
      setPrefsError("Network error. Please try again.");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function storeManagedKey() {
    if (storingKey) return;
    const trimmed = managedKey.trim();
    if (trimmed.length < 8) {
      setKeyStatus("error");
      setKeyError("Key must be at least 8 characters.");
      return;
    }
    setStoringKey(true);
    setKeyError(null);
    try {
      const res = await fetch(`/api/bots/${botId}/llm-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setKeyStatus("error");
        setKeyError(
          body.error === "managed_storage_unavailable"
            ? "This deployment hasn't enabled managed key storage. Contact the operator."
            : "Couldn't store the encrypted key. Please try again.",
        );
        return;
      }
      // Mirror the key into the encrypted IndexedDB store too so
      // the creator's own dashboard test chat keeps working without
      // re-entry.
      await setApiKey(trimmed);
      setManagedKey("");
      setKeyStatus("stored");
      await fetchAudit();
    } catch {
      setKeyStatus("error");
      setKeyError("Network error. Please try again.");
    } finally {
      setStoringKey(false);
    }
  }

  async function revokeManagedKey() {
    if (storingKey) return;
    if (
      !confirm(
        "Revoke the managed key? Recruiters won't be able to chat with your bot until you store a new key.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/bots/${botId}/llm-key`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setKeyError("Couldn't revoke. Please try again.");
        return;
      }
      setKeyError(null);
      setKeyStatus("idle");
      await fetchAudit();
    } catch {
      setKeyError("Network error. Please try again.");
    }
  }

  const current = describeProvider(provider, model);
  const dirtyPrefs =
    provider !== initialProvider || (model || null) !== initialModel;
  const models = MODEL_OPTIONS[provider];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-brand"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-sm leading-relaxed text-ink">
          <strong>Your key stays encrypted end-to-end.</strong>{" "}
          Envelope-encrypted at rest on pro-bot.dev so recruiters can chat any
          time, and never logged in plaintext.
        </p>
      </div>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Provider &amp; model</h3>
        <p className="mb-5 text-xs text-muted">
          Switch any time. Active: {current.name} · {current.model}
        </p>

        <label className="mb-2 block text-xs font-semibold">Provider</label>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDER_NAMES.map((p) => {
            const active = provider === p;
            const meta = PROVIDER_LABELS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => selectProvider(p)}
                className={`rounded-xl border-2 p-3 text-center transition-colors ${
                  active
                    ? "border-brand bg-blue-50/50"
                    : "border-border-base hover:border-brand/40"
                }`}
              >
                <p className="text-sm font-bold">{meta.name}</p>
                <p className="text-[11px] text-muted">{meta.family}</p>
              </button>
            );
          })}
        </div>

        <label
          htmlFor="ai-model-input"
          className="mb-1.5 block text-xs font-semibold"
        >
          Model
        </label>
        {models.length === 0 ? (
          <input
            id="ai-model-input"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={
              provider === "azure"
                ? "your Azure deployment name"
                : provider === "ollama"
                  ? "llama3.2"
                  : "model id (e.g. grok-4.3)"
            }
            className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        ) : (
          <select
            id="ai-model-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        {prefsError ? (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            {prefsError}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-3">
          {prefsStatus === "saved" ? (
            <span className="text-sm font-medium text-emerald-700">Saved!</span>
          ) : null}
          <button
            type="button"
            onClick={savePrefs}
            disabled={!dirtyPrefs || savingPrefs}
            className="btn btn-primary disabled:opacity-60"
          >
            {savingPrefs ? "Saving…" : "Save provider"}
          </button>
        </div>
      </section>

      {provider === "azure" ? (
        <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="font-bold">Azure credentials</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                azureKeyStored
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {azureKeyStored ? "Saved" : "Not saved"}
            </span>
          </div>
          <p className="mb-5 text-xs text-muted">
            Kept encrypted in your browser. Azure&apos;s multi-secret credential
            isn&apos;t supported by server-side managed storage in this release,
            so recruiters can only reach an Azure bot when you&apos;re online -
            or via the{" "}
            <Link
              href="/self-hosted-bot"
              className="text-brand font-semibold hover:underline"
            >
              self-hosted runtime
            </Link>
            .
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="azure-endpoint-input"
                className="mb-1.5 block text-xs font-semibold"
              >
                Azure endpoint
              </label>
              <input
                id="azure-endpoint-input"
                type="url"
                value={azureEndpoint}
                onChange={(e) => setAzureEndpoint(e.target.value)}
                autoComplete="off"
                placeholder="https://your-resource.cognitiveservices.azure.com"
                className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <p className="mt-1.5 text-[11px] text-muted">Must use https://</p>
            </div>

            <div>
              <label
                htmlFor="azure-version-input"
                className="mb-1.5 block text-xs font-semibold"
              >
                API version
              </label>
              <input
                id="azure-version-input"
                type="text"
                value={azureApiVersion}
                onChange={(e) => setAzureApiVersion(e.target.value)}
                autoComplete="off"
                placeholder={DEFAULT_AZURE_API_VERSION}
                className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="azure-key-input"
                className="mb-1.5 block text-xs font-semibold"
              >
                Azure API key
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="azure-key-input"
                  type={showAzureKey ? "text" : "password"}
                  value={azureKey}
                  onChange={(e) => setAzureKey(e.target.value)}
                  autoComplete="off"
                  placeholder={
                    azureKeyStored
                      ? "•••••••• (key stored - re-enter to replace)"
                      : "your Azure key"
                  }
                  className="flex-1 rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowAzureKey((v) => !v)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  {showAzureKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Deployment name comes from the <strong>Model</strong> field
                above.
              </p>
            </div>
          </div>

          {azureError ? (
            <p role="alert" className="mt-3 text-xs text-rose-700">
              {azureError}
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-3">
            {azureStatus === "saved" ? (
              <span className="text-sm font-medium text-emerald-700">
                Saved!
              </span>
            ) : null}
            <button
              type="button"
              onClick={saveAzureCreds}
              disabled={savingAzure}
              className="btn btn-primary disabled:opacity-60"
            >
              {savingAzure
                ? "Saving…"
                : azureKeyStored
                  ? "Update credentials"
                  : "Save credentials"}
            </button>
          </div>
        </section>
      ) : null}

      {provider === "azure" ? null : botId ? (
        <>
          <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="font-bold">Managed key storage</h3>
              <ManagedKeyStatusPill audit={audit} />
            </div>
            <p className="mb-5 text-xs text-muted">
              Stored encrypted with envelope encryption. The plaintext is in
              memory only during one chat request, then discarded. Required for
              recruiters to chat with your bot when you&apos;re offline.
            </p>

            <label
              htmlFor="managed-key-input"
              className="mb-1.5 block text-xs font-semibold"
            >
              {PROVIDER_LABELS[provider].name} API key
            </label>
            <div className="flex items-center gap-2">
              <input
                id="managed-key-input"
                type={showKey ? "text" : "password"}
                value={managedKey}
                onChange={(e) => setManagedKey(e.target.value)}
                autoComplete="off"
                placeholder={
                  audit?.stored
                    ? "•••••••• (key stored - re-enter to replace)"
                    : "sk-…"
                }
                className="flex-1 rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>

            {keyError ? (
              <p role="alert" className="mt-3 text-xs text-rose-700">
                {keyError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              {keyStatus === "stored" ? (
                <span className="text-sm font-medium text-emerald-700">
                  Encrypted & stored!
                </span>
              ) : null}
              {audit?.stored ? (
                <button
                  type="button"
                  onClick={revokeManagedKey}
                  className="btn btn-secondary"
                >
                  Revoke
                </button>
              ) : null}
              <button
                type="button"
                onClick={storeManagedKey}
                disabled={storingKey || managedKey.trim().length < 8}
                className="btn btn-primary disabled:opacity-60"
              >
                {storingKey
                  ? "Encrypting…"
                  : audit?.stored
                    ? "Replace key"
                    : "Encrypt & Store"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
            <h3 className="mb-1 font-bold">Decrypt audit log</h3>
            <p className="mb-5 text-xs text-muted">
              Every time your managed key is used to serve a recruiter, a row
              lands here (timestamp + a short non-reversible hash). Retained for
              30 days. No raw identifiers, no key material is ever stored.
            </p>
            {auditError ? (
              <p className="text-xs text-rose-700">{auditError}</p>
            ) : !audit || audit.entries.length === 0 ? (
              <p className="text-xs text-muted">
                No decrypt events in the last 30 days.
              </p>
            ) : (
              <ul className="thin-scroll max-h-72 overflow-y-auto rounded-xl border border-border-base">
                {audit.entries.map((entry, i) => (
                  <li
                    key={`${entry.decryptedAt}-${i}`}
                    className="flex items-center justify-between border-b border-border-base px-3 py-2 text-xs last:border-b-0"
                  >
                    <span className="font-mono">
                      {formatTimestamp(entry.decryptedAt)}
                    </span>
                    <span className="text-muted">
                      {entry.ipHashSuffix
                        ? `from …${entry.ipHashSuffix}`
                        : "from unknown"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-border-base bg-white p-6 text-sm text-muted shadow-soft">
          Create a bot to store a managed key and view its decrypt audit log.
          Your provider &amp; model preference above applies to all your bots.
        </section>
      )}
    </div>
  );
}

function isProviderName(
  value: string | null | undefined,
): value is ProviderName {
  if (!value) return false;
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

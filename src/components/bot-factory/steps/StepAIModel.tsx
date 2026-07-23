"use client";

import { useEffect, useState } from "react";

import { MODEL_OPTIONS } from "@/lib/ai/model-options";
import { PROVIDER_LABELS } from "@/lib/ai/provider-labels";
import { PROVIDER_NAMES, type ProviderName } from "@/lib/ai/providers";

import { DEFAULT_AZURE_API_VERSION, ENABLED_PROVIDERS } from "../constants";
import { StepHeading } from "../parts/StepHeading";
import type { FormState, PatchFn } from "../types";

export function StepAIModel({
  form,
  patch,
  selectProvider,
}: {
  form: FormState;
  patch: PatchFn;
  selectProvider: (p: ProviderName) => void;
}) {
  const models = MODEL_OPTIONS[form.llmProvider];
  const providerLabel = PROVIDER_LABELS[form.llmProvider].name;

  const hasStoredKey = form.apiKeyStoredMask !== null;
  const [editingKey, setEditingKey] = useState(true);
  useEffect(() => {
    if (hasStoredKey && form.apiKey.length === 0) setEditingKey(false);
  }, [hasStoredKey, form.apiKey.length]);

  return (
    <section>
      <StepHeading
        step={4}
        title="Choose your AI model."
        subtitle="Pick a provider and paste the key. Your key is envelope-encrypted on pro-bot.dev and only decrypted inside a chat request."
      />

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold mb-2">Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROVIDER_NAMES.map((p) => {
              const enabled = ENABLED_PROVIDERS.has(p);
              const active = form.llmProvider === p;
              const meta = PROVIDER_LABELS[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectProvider(p)}
                  disabled={!enabled}
                  className={`relative p-3 rounded-xl border-2 text-center transition-colors ${
                    active
                      ? "border-brand bg-blue-50/50"
                      : enabled
                        ? "border-border-base hover:border-brand/40"
                        : "border-border-base opacity-50 cursor-not-allowed"
                  }`}
                >
                  {!enabled && (
                    <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-muted text-white px-1.5 py-0.5 rounded-full">
                      SOON
                    </span>
                  )}
                  <p className="text-sm font-bold">{meta.name}</p>
                  <p className="text-[11px] text-muted">{meta.family}</p>
                </button>
              );
            })}
          </div>
        </div>

        {form.llmProvider === "azure" ? (
          <>
            <div>
              <label
                htmlFor="bf-az-endpoint"
                className="block text-xs font-semibold mb-1.5"
              >
                Azure endpoint
              </label>
              <input
                id="bf-az-endpoint"
                type="url"
                value={form.azureEndpoint}
                onChange={(e) => patch("azureEndpoint", e.target.value)}
                maxLength={512}
                placeholder="https://your-resource.cognitiveservices.azure.com"
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted mt-1.5">Must use https://</p>
            </div>
            <div>
              <label
                htmlFor="bf-az-deployment"
                className="block text-xs font-semibold mb-1.5"
              >
                Deployment name
              </label>
              <input
                id="bf-az-deployment"
                type="text"
                value={form.llmModel}
                onChange={(e) => patch("llmModel", e.target.value)}
                maxLength={60}
                placeholder="gpt-4o-mini"
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted mt-1.5">
                The name you gave the deployment in Azure (it is also the model
                id sent in requests).
              </p>
            </div>
            <div>
              <label
                htmlFor="bf-az-version"
                className="block text-xs font-semibold mb-1.5"
              >
                API version
              </label>
              <input
                id="bf-az-version"
                type="text"
                value={form.azureApiVersion}
                onChange={(e) => patch("azureApiVersion", e.target.value)}
                maxLength={64}
                placeholder={DEFAULT_AZURE_API_VERSION}
                className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                autoComplete="off"
              />
            </div>
          </>
        ) : models.length > 0 ? (
          <div>
            <label
              htmlFor="bf-model"
              className="block text-xs font-semibold mb-1.5"
            >
              Model
            </label>
            <select
              id="bf-model"
              value={form.llmModel}
              onChange={(e) => patch("llmModel", e.target.value)}
              className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand bg-white"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label
              htmlFor="bf-model"
              className="block text-xs font-semibold mb-1.5"
            >
              Model
            </label>
            <input
              id="bf-model"
              type="text"
              value={form.llmModel}
              onChange={(e) => patch("llmModel", e.target.value)}
              maxLength={60}
              placeholder="grok-4.3"
              className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted mt-1.5">
              The {providerLabel} model id to use.
            </p>
          </div>
        )}

        {
          <div>
            <label
              htmlFor="bf-key"
              className="block text-xs font-semibold mb-1.5"
            >
              {providerLabel} API key
            </label>
            {hasStoredKey && !editingKey ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    id="bf-key"
                    type="text"
                    value={form.apiKeyStoredMask ?? ""}
                    readOnly
                    aria-label={`${providerLabel} API key (stored)`}
                    className="flex-1 py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none bg-neutral-50 text-muted font-mono cursor-default"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingKey(true)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Stored on this device · click Edit to replace
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    id="bf-key"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => patch("apiKey", e.target.value)}
                    maxLength={256}
                    placeholder={
                      form.llmProvider === "azure"
                        ? "your azure key"
                        : form.llmProvider === "grok"
                          ? "xai-…"
                          : "sk-…"
                    }
                    className="flex-1 py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand font-mono"
                    autoComplete="off"
                    autoFocus={hasStoredKey}
                  />
                  {hasStoredKey ? (
                    <button
                      type="button"
                      onClick={() => {
                        patch("apiKey", "");
                        setEditingKey(false);
                      }}
                      className="text-xs font-semibold text-muted hover:text-neutral-900 hover:underline"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Stored locally · never tracked by ProBot
                </p>
              </>
            )}
          </div>
        }
      </div>
    </section>
  );
}

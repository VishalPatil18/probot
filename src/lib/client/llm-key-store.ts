// Browser-only store for the user's LLM API key.
//
// Switched from plaintext localStorage to IndexedDB +
// Web Crypto AES-256-GCM (see ./secure-key-store.ts). The public API
// here is async; callers await the get/set/clear functions. localStorage
// is still consulted on first read as a one-time migration so creators
// who set their key earlier don't have to re-enter it.
//
// The key is attached to chat requests via the `x-llm-api-key` header
// and is never sent in JSON bodies or round-tripped through any ProBot
// API endpoint.

import { getSecureKeyStore } from "./secure-key-store";

const LEGACY_STORAGE_KEY = "probot.llm.key.v1";
const LEGACY_AZURE_KEY = "probot.llm.azure.v1";
const LEGACY_OLLAMA_KEY = "probot.llm.ollama.v1";
const SECRET_NAME = "llm.key.v1";
const AZURE_SECRET_NAME = "llm.azure.v1";
const OLLAMA_SECRET_NAME = "llm.ollama.v1";

function legacyLocal(): Storage | null {
  if (typeof window === "undefined") return null;
  if (typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

async function migrateFromLocalStorage(
  secretName: string,
  legacyKey: string,
): Promise<string | null> {
  const ls = legacyLocal();
  if (!ls) return null;
  const value = ls.getItem(legacyKey);
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    ls.removeItem(legacyKey);
    return null;
  }
  const store = getSecureKeyStore();
  if (!store) return trimmed; // best-effort: at least return the value
  try {
    await store.setSecret(secretName, trimmed);
    ls.removeItem(legacyKey);
  } catch {
    // Migration failure - leave the localStorage entry in place so a
    // future visit retries. We still return the value so the current
    // request keeps working.
  }
  return trimmed;
}

export async function getApiKey(): Promise<string | null> {
  const store = getSecureKeyStore();
  if (!store) {
    // No IDB / no crypto.subtle (e.g. SSR or old browser). Fall back
    // to the legacy localStorage read so the chat still works.
    const ls = legacyLocal();
    if (!ls) return null;
    const value = ls.getItem(LEGACY_STORAGE_KEY);
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  const stored = await store.getSecret(SECRET_NAME);
  if (stored !== null) return stored;
  return migrateFromLocalStorage(SECRET_NAME, LEGACY_STORAGE_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  const store = getSecureKeyStore();
  if (!store) {
    const ls = legacyLocal();
    if (!ls) return;
    const trimmed = key.trim();
    if (trimmed.length === 0) ls.removeItem(LEGACY_STORAGE_KEY);
    else ls.setItem(LEGACY_STORAGE_KEY, trimmed);
    return;
  }
  await store.setSecret(SECRET_NAME, key);
  // Clear the legacy localStorage entry so the post-migration browser
  // doesn't show the API key in DevTools.
  legacyLocal()?.removeItem(LEGACY_STORAGE_KEY);
}

export async function clearApiKey(): Promise<void> {
  const store = getSecureKeyStore();
  if (store) await store.clearSecret(SECRET_NAME);
  legacyLocal()?.removeItem(LEGACY_STORAGE_KEY);
}

export type AzureCreds = {
  endpoint: string;
  apiVersion: string;
};

function parseAzureBlob(raw: string): AzureCreds | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AzureCreds>;
    const endpoint =
      typeof parsed.endpoint === "string" ? parsed.endpoint.trim() : "";
    const apiVersion =
      typeof parsed.apiVersion === "string" ? parsed.apiVersion.trim() : "";
    if (endpoint.length === 0) return null;
    return { endpoint, apiVersion };
  } catch {
    return null;
  }
}

export async function getAzureCreds(): Promise<AzureCreds | null> {
  const store = getSecureKeyStore();
  if (!store) {
    const ls = legacyLocal();
    if (!ls) return null;
    const raw = ls.getItem(LEGACY_AZURE_KEY);
    return raw === null ? null : parseAzureBlob(raw);
  }
  const stored = await store.getSecret(AZURE_SECRET_NAME);
  if (stored !== null) return parseAzureBlob(stored);
  const migrated = await migrateFromLocalStorage(
    AZURE_SECRET_NAME,
    LEGACY_AZURE_KEY,
  );
  return migrated === null ? null : parseAzureBlob(migrated);
}

export async function setAzureCreds(creds: AzureCreds): Promise<void> {
  const endpoint = creds.endpoint.trim();
  const apiVersion = creds.apiVersion.trim();
  const store = getSecureKeyStore();
  if (endpoint.length === 0) {
    if (store) await store.clearSecret(AZURE_SECRET_NAME);
    legacyLocal()?.removeItem(LEGACY_AZURE_KEY);
    return;
  }
  const payload = JSON.stringify({ endpoint, apiVersion });
  if (store) {
    await store.setSecret(AZURE_SECRET_NAME, payload);
    legacyLocal()?.removeItem(LEGACY_AZURE_KEY);
  } else {
    legacyLocal()?.setItem(LEGACY_AZURE_KEY, payload);
  }
}

export async function clearAzureCreds(): Promise<void> {
  const store = getSecureKeyStore();
  if (store) await store.clearSecret(AZURE_SECRET_NAME);
  legacyLocal()?.removeItem(LEGACY_AZURE_KEY);
}

// Ollama needs only a base URL (where the local model server lives) - no key.
// Stored alongside the keys so the chat UI can attach it as the
// `x-llm-ollama-base-url` header on each request.
export async function getOllamaBaseUrl(): Promise<string | null> {
  const store = getSecureKeyStore();
  if (!store) {
    const ls = legacyLocal();
    if (!ls) return null;
    const raw = ls.getItem(LEGACY_OLLAMA_KEY);
    if (raw === null) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  const stored = await store.getSecret(OLLAMA_SECRET_NAME);
  if (stored !== null) return stored;
  return migrateFromLocalStorage(OLLAMA_SECRET_NAME, LEGACY_OLLAMA_KEY);
}

export async function setOllamaBaseUrl(baseUrl: string): Promise<void> {
  const trimmed = baseUrl.trim();
  const store = getSecureKeyStore();
  if (trimmed.length === 0) {
    if (store) await store.clearSecret(OLLAMA_SECRET_NAME);
    legacyLocal()?.removeItem(LEGACY_OLLAMA_KEY);
    return;
  }
  if (store) {
    await store.setSecret(OLLAMA_SECRET_NAME, trimmed);
    legacyLocal()?.removeItem(LEGACY_OLLAMA_KEY);
  } else {
    legacyLocal()?.setItem(LEGACY_OLLAMA_KEY, trimmed);
  }
}

export async function clearOllamaBaseUrl(): Promise<void> {
  const store = getSecureKeyStore();
  if (store) await store.clearSecret(OLLAMA_SECRET_NAME);
  legacyLocal()?.removeItem(LEGACY_OLLAMA_KEY);
}

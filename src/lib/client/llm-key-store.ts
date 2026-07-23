import { getSecureKeyStore } from "./secure-key-store";

const LEGACY_STORAGE_KEY = "probot.llm.key.v1";
const LEGACY_AZURE_KEY = "probot.llm.azure.v1";
const SECRET_NAME = "llm.key.v1";
const AZURE_SECRET_NAME = "llm.azure.v1";

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
  if (!store) return trimmed;
  try {
    await store.setSecret(secretName, trimmed);
    ls.removeItem(legacyKey);
  } catch {}
  return trimmed;
}

export async function getApiKey(): Promise<string | null> {
  const store = getSecureKeyStore();
  if (!store) {
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

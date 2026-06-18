// Browser-only store for the user's LLM API key.
//
// The key is persisted under a single per-origin localStorage entry and
// attached to chat requests via the `x-llm-api-key` header. It is never
// sent in JSON bodies (so accidental request-body logging cannot leak it)
// and never round-tripped through any ProBot API endpoint.

const STORAGE_KEY = "probot.llm.key.v1";
const AZURE_STORAGE_KEY = "probot.llm.azure.v1";

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function getApiKey(): string | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function setApiKey(key: string): void {
  if (!isBrowser()) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearApiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Azure-specific extra credentials. The API key still goes through the
// existing single-key path (`getApiKey`/`setApiKey`). These two fields are
// stored separately so switching between providers (e.g. Anthropic ↔ Azure)
// doesn't wipe the other provider's key.

export type AzureCreds = {
  endpoint: string;
  apiVersion: string;
};

export function getAzureCreds(): AzureCreds | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AZURE_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AzureCreds>;
    const endpoint =
      typeof parsed.endpoint === "string" ? parsed.endpoint.trim() : "";
    const apiVersion =
      typeof parsed.apiVersion === "string" ? parsed.apiVersion.trim() : "";
    if (endpoint.length === 0) return null;
    return { endpoint, apiVersion };
  } catch {
    // Corrupted entry - treat as absent. Caller decides what to do.
    return null;
  }
}

export function setAzureCreds(creds: AzureCreds): void {
  if (!isBrowser()) return;
  const endpoint = creds.endpoint.trim();
  const apiVersion = creds.apiVersion.trim();
  if (endpoint.length === 0) {
    window.localStorage.removeItem(AZURE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    AZURE_STORAGE_KEY,
    JSON.stringify({ endpoint, apiVersion }),
  );
}

export function clearAzureCreds(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AZURE_STORAGE_KEY);
}

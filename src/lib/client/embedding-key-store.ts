// Browser-only store for the user's OpenAI embedding API key (used for RAG).
//
// Same IndexedDB + Web Crypto upgrade as the chat-key
// store. Public API is async; localStorage is consulted as a one-time
// migration so creators don't have to re-enter the key after the
// upgrade. Attached to upload + chat requests via the
// `x-embedding-api-key` header.

import { getSecureKeyStore } from "./secure-key-store";

const LEGACY_STORAGE_KEY = "probot.embedding.key.v1";
const SECRET_NAME = "embedding.key.v1";

function legacyLocal(): Storage | null {
  if (typeof window === "undefined") return null;
  if (typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

async function migrate(): Promise<string | null> {
  const ls = legacyLocal();
  if (!ls) return null;
  const value = ls.getItem(LEGACY_STORAGE_KEY);
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    ls.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
  const store = getSecureKeyStore();
  if (!store) return trimmed;
  try {
    await store.setSecret(SECRET_NAME, trimmed);
    ls.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // see llm-key-store.ts for the migration-failure rationale
  }
  return trimmed;
}

export async function getEmbeddingApiKey(): Promise<string | null> {
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
  return migrate();
}

export async function setEmbeddingApiKey(key: string): Promise<void> {
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

export async function clearEmbeddingApiKey(): Promise<void> {
  const store = getSecureKeyStore();
  if (store) await store.clearSecret(SECRET_NAME);
  legacyLocal()?.removeItem(LEGACY_STORAGE_KEY);
}

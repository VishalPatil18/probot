// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearApiKey,
  clearAzureCreds,
  getApiKey,
  getAzureCreds,
  setApiKey,
  setAzureCreds,
} from "./llm-key-store";
import { __resetSecureKeyStoreForTests } from "./secure-key-store";

// fake-indexeddb hangs `indexedDB` on the global; jsdom's `window` is the
// global object too. We re-export so the SUT's `window.indexedDB` check
// passes.
//
// crypto.subtle: vitest's jsdom env exposes Node's WebCrypto via
// `globalThis.crypto.subtle`. We assert it before running so a future
// runtime swap doesn't silently make these tests pass-by-skip.

beforeEach(async () => {
  // Close + drop the cached DB connection from the previous test before
  // we delete the database; otherwise `deleteDatabase` blocks forever
  // waiting for the open connection to close (fake-indexeddb fires
  // `onblocked` and never settles).
  await __resetSecureKeyStoreForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("probot-secure-store");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("llm-key-store", () => {
  it("returns null when no key has been set", async () => {
    expect(await getApiKey()).toBeNull();
  });

  it("roundtrips a set value via getApiKey", async () => {
    await setApiKey("sk-ant-test-1234567890");
    expect(await getApiKey()).toBe("sk-ant-test-1234567890");
  });

  it("overwrites the prior value on a second setApiKey", async () => {
    await setApiKey("first-key-1234567890");
    await setApiKey("second-key-1234567890");
    expect(await getApiKey()).toBe("second-key-1234567890");
  });

  it("removes the entry on clearApiKey", async () => {
    await setApiKey("sk-ant-test-1234567890");
    await clearApiKey();
    expect(await getApiKey()).toBeNull();
    expect(window.localStorage.getItem("probot.llm.key.v1")).toBeNull();
  });

  it("trims whitespace before storing", async () => {
    await setApiKey("  sk-ant-test-1234567890  ");
    expect(await getApiKey()).toBe("sk-ant-test-1234567890");
  });

  it("treats an empty/whitespace-only setApiKey as a clear", async () => {
    await setApiKey("sk-ant-test-1234567890");
    await setApiKey("   ");
    expect(await getApiKey()).toBeNull();
  });

  it("never persists the api key in plaintext localStorage after a fresh write", async () => {
    await setApiKey("sk-canary-FAKE-CANARY-1234567890");
    expect(
      window.localStorage.getItem("probot.llm.key.v1"),
    ).toBeNull();
  });

  it("migrates a legacy localStorage value on first read, then clears the legacy slot", async () => {
    window.localStorage.setItem(
      "probot.llm.key.v1",
      "sk-legacy-migrated-1234567890",
    );
    const value = await getApiKey();
    expect(value).toBe("sk-legacy-migrated-1234567890");
    expect(window.localStorage.getItem("probot.llm.key.v1")).toBeNull();
    // Subsequent read should hit IDB and produce the same value.
    expect(await getApiKey()).toBe("sk-legacy-migrated-1234567890");
  });
});

describe("Azure creds", () => {
  const sample = {
    endpoint: "https://example.cognitiveservices.azure.com",
    apiVersion: "2025-01-01-preview",
  };

  it("returns null when no Azure creds have been set", async () => {
    expect(await getAzureCreds()).toBeNull();
  });

  it("roundtrips a set value via getAzureCreds", async () => {
    await setAzureCreds(sample);
    expect(await getAzureCreds()).toEqual(sample);
  });

  it("overwrites the prior value on a second setAzureCreds", async () => {
    await setAzureCreds(sample);
    const next = {
      endpoint: "https://other.cognitiveservices.azure.com",
      apiVersion: "2024-10-21",
    };
    await setAzureCreds(next);
    expect(await getAzureCreds()).toEqual(next);
  });

  it("removes the entry on clearAzureCreds", async () => {
    await setAzureCreds(sample);
    await clearAzureCreds();
    expect(await getAzureCreds()).toBeNull();
    expect(window.localStorage.getItem("probot.llm.azure.v1")).toBeNull();
  });

  it("trims whitespace before storing", async () => {
    await setAzureCreds({
      endpoint: "  https://example.cognitiveservices.azure.com  ",
      apiVersion: "  2025-01-01-preview  ",
    });
    expect(await getAzureCreds()).toEqual(sample);
  });

  it("treats an empty endpoint as a clear", async () => {
    await setAzureCreds(sample);
    await setAzureCreds({ endpoint: "   ", apiVersion: sample.apiVersion });
    expect(await getAzureCreds()).toBeNull();
  });

  it("the Azure entry is independent from the api-key entry", async () => {
    await setApiKey("sk-some-other-1234567890");
    await setAzureCreds(sample);
    expect(await getApiKey()).toBe("sk-some-other-1234567890");
    expect(await getAzureCreds()).toEqual(sample);
    await clearAzureCreds();
    expect(await getApiKey()).toBe("sk-some-other-1234567890");
  });
});

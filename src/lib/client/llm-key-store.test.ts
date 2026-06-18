// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  clearApiKey,
  clearAzureCreds,
  getApiKey,
  getAzureCreds,
  setApiKey,
  setAzureCreds,
} from "./llm-key-store";

afterEach(() => {
  window.localStorage.clear();
});

describe("llm-key-store", () => {
  it("returns null when no key has been set", () => {
    expect(getApiKey()).toBeNull();
  });

  it("roundtrips a set value via getApiKey", () => {
    setApiKey("sk-ant-test-1234567890");
    expect(getApiKey()).toBe("sk-ant-test-1234567890");
  });

  it("overwrites the prior value on a second setApiKey", () => {
    setApiKey("first-key-1234567890");
    setApiKey("second-key-1234567890");
    expect(getApiKey()).toBe("second-key-1234567890");
  });

  it("removes the entry on clearApiKey", () => {
    setApiKey("sk-ant-test-1234567890");
    clearApiKey();
    expect(getApiKey()).toBeNull();
    expect(window.localStorage.getItem("probot.llm.key.v1")).toBeNull();
  });

  it("trims whitespace before storing", () => {
    setApiKey("  sk-ant-test-1234567890  ");
    expect(getApiKey()).toBe("sk-ant-test-1234567890");
  });

  it("treats an empty/whitespace-only setApiKey as a clear", () => {
    setApiKey("sk-ant-test-1234567890");
    setApiKey("   ");
    expect(getApiKey()).toBeNull();
  });
});

describe("Azure creds", () => {
  const sample = {
    endpoint: "https://example.cognitiveservices.azure.com",
    apiVersion: "2025-01-01-preview",
  };

  it("returns null when no Azure creds have been set", () => {
    expect(getAzureCreds()).toBeNull();
  });

  it("roundtrips a set value via getAzureCreds", () => {
    setAzureCreds(sample);
    expect(getAzureCreds()).toEqual(sample);
  });

  it("overwrites the prior value on a second setAzureCreds", () => {
    setAzureCreds(sample);
    const next = { endpoint: "https://other.cognitiveservices.azure.com", apiVersion: "2024-10-21" };
    setAzureCreds(next);
    expect(getAzureCreds()).toEqual(next);
  });

  it("removes the entry on clearAzureCreds", () => {
    setAzureCreds(sample);
    clearAzureCreds();
    expect(getAzureCreds()).toBeNull();
    expect(window.localStorage.getItem("probot.llm.azure.v1")).toBeNull();
  });

  it("trims whitespace before storing", () => {
    setAzureCreds({
      endpoint: "  https://example.cognitiveservices.azure.com  ",
      apiVersion: "  2025-01-01-preview  ",
    });
    expect(getAzureCreds()).toEqual(sample);
  });

  it("treats an empty endpoint as a clear", () => {
    setAzureCreds(sample);
    setAzureCreds({ endpoint: "   ", apiVersion: sample.apiVersion });
    expect(getAzureCreds()).toBeNull();
  });

  it("returns null on a corrupted localStorage entry", () => {
    window.localStorage.setItem("probot.llm.azure.v1", "not json");
    expect(getAzureCreds()).toBeNull();
  });

  it("the Azure entry is independent from the api-key entry", () => {
    setApiKey("sk-some-other-1234567890");
    setAzureCreds(sample);
    expect(getApiKey()).toBe("sk-some-other-1234567890");
    expect(getAzureCreds()).toEqual(sample);
    clearAzureCreds();
    expect(getApiKey()).toBe("sk-some-other-1234567890");
  });
});

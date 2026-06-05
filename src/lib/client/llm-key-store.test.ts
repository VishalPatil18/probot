// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { clearApiKey, getApiKey, setApiKey } from "./llm-key-store";

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

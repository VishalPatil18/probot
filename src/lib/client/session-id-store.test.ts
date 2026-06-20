// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { getOrCreateSessionId } from "./session-id-store";

const STORAGE_KEY = "probot.chat.sessionId";
const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("getOrCreateSessionId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("generates a v4-shaped UUID on first call and persists it", () => {
    const id = getOrCreateSessionId();
    expect(id).toMatch(UUID_V4_LIKE);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it("returns the same ID across repeated calls within the same tab", () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();
    const third = getOrCreateSessionId();
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("reuses an existing sessionStorage value (simulates tab reload)", () => {
    const seeded = "11111111-2222-4333-8444-555555555555";
    window.sessionStorage.setItem(STORAGE_KEY, seeded);
    expect(getOrCreateSessionId()).toBe(seeded);
  });

  it("regenerates when the stored value is an empty string", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "");
    const id = getOrCreateSessionId();
    expect(id).toMatch(UUID_V4_LIKE);
    expect(id.length).toBeGreaterThan(0);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it("returns a fresh UUID when sessionStorage throws (private-mode / quota)", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("QuotaExceeded");
    };
    try {
      const id = getOrCreateSessionId();
      expect(id).toMatch(UUID_V4_LIKE);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

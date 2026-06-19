import { describe, expect, it } from "vitest";

import { isPlaceholderUsername } from "./placeholder";

describe("isPlaceholderUsername", () => {
  it("returns true for `user-` + 8 lowercase hex chars", () => {
    expect(isPlaceholderUsername("user-abcdef12")).toBe(true);
    expect(isPlaceholderUsername("user-00000000")).toBe(true);
    expect(isPlaceholderUsername("user-deadbeef")).toBe(true);
  });

  it("returns false for human-chosen usernames", () => {
    expect(isPlaceholderUsername("jane-doe")).toBe(false);
    expect(isPlaceholderUsername("vishal")).toBe(false);
    expect(isPlaceholderUsername("user")).toBe(false);
  });

  it("returns false for placeholder-shaped but wrong length", () => {
    expect(isPlaceholderUsername("user-abc")).toBe(false);
    expect(isPlaceholderUsername("user-abcdef123")).toBe(false);
  });

  it("returns false for uppercase hex (regex is lowercase-only)", () => {
    expect(isPlaceholderUsername("user-ABCDEF12")).toBe(false);
  });

  it("returns false for non-hex characters in the suffix", () => {
    expect(isPlaceholderUsername("user-zzzzzzzz")).toBe(false);
    expect(isPlaceholderUsername("user-abcdefgh")).toBe(false);
  });

  it("returns false for a leading or trailing space", () => {
    expect(isPlaceholderUsername(" user-abcdef12")).toBe(false);
    expect(isPlaceholderUsername("user-abcdef12 ")).toBe(false);
  });
});

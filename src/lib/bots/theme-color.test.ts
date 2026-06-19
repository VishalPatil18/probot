import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_COLOR,
  THEME_COLOR_REGEX,
  isValidThemeColor,
  themeColorSchema,
} from "./theme-color";

describe("DEFAULT_THEME_COLOR", () => {
  it("matches the THEME_COLOR_REGEX (sanity check)", () => {
    expect(THEME_COLOR_REGEX.test(DEFAULT_THEME_COLOR)).toBe(true);
  });
});

describe("isValidThemeColor", () => {
  it("accepts 6-digit lowercase hex", () => {
    expect(isValidThemeColor("#7c5cff")).toBe(true);
    expect(isValidThemeColor("#000000")).toBe(true);
    expect(isValidThemeColor("#ffffff")).toBe(true);
  });

  it("accepts 6-digit uppercase hex", () => {
    expect(isValidThemeColor("#7C5CFF")).toBe(true);
    expect(isValidThemeColor("#ABCDEF")).toBe(true);
  });

  it("rejects shorthand #FFF", () => {
    expect(isValidThemeColor("#fff")).toBe(false);
  });

  it("rejects missing leading #", () => {
    expect(isValidThemeColor("7c5cff")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidThemeColor("#zzzzzz")).toBe(false);
    expect(isValidThemeColor("#7c5cfg")).toBe(false);
  });

  it("rejects extra characters", () => {
    expect(isValidThemeColor("#7c5cff00")).toBe(false);
    expect(isValidThemeColor("#7c5cff ")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidThemeColor("")).toBe(false);
  });
});

describe("themeColorSchema (Zod)", () => {
  it("parses valid hex", () => {
    expect(() => themeColorSchema.parse("#7c5cff")).not.toThrow();
  });

  it("throws on invalid hex with the documented message", () => {
    const result = themeColorSchema.safeParse("#nope");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /Theme color must be a 6-digit hex/,
      );
    }
  });
});

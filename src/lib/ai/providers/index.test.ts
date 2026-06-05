import { describe, expect, it } from "vitest";

import { anthropicProvider } from "./anthropic";
import { deepseekProvider } from "./deepseek";
import { googleProvider } from "./google";
import {
  PROVIDER_NAMES,
  getProvider,
  isProviderName,
} from "./index";
import { openaiProvider } from "./openai";

describe("PROVIDER_NAMES", () => {
  it("contains all four supported provider identifiers", () => {
    expect([...PROVIDER_NAMES].sort()).toEqual(
      ["anthropic", "deepseek", "google", "openai"].sort(),
    );
  });
});

describe("getProvider", () => {
  it.each([
    ["anthropic", anthropicProvider],
    ["openai", openaiProvider],
    ["google", googleProvider],
    ["deepseek", deepseekProvider],
  ] as const)("returns the %s adapter", (name, expected) => {
    expect(getProvider(name)).toBe(expected);
  });
});

describe("isProviderName", () => {
  it.each(["anthropic", "openai", "google", "deepseek"])(
    "accepts the known provider name %s",
    (name) => {
      expect(isProviderName(name)).toBe(true);
    },
  );

  it.each(["", "unknown", "ANTHROPIC", "claude", "gpt"])(
    "rejects the unknown value %s",
    (value) => {
      expect(isProviderName(value)).toBe(false);
    },
  );
});

import { describe, expect, it } from "vitest";

import { anthropicProvider } from "./anthropic";
import { azureProvider } from "./azure";
import { googleProvider } from "./google";
import { grokProvider } from "./grok";
import {
  PROVIDER_NAMES,
  getProvider,
  isProviderName,
} from "./index";
import { openaiProvider } from "./openai";

describe("PROVIDER_NAMES", () => {
  it("contains all supported provider identifiers", () => {
    expect([...PROVIDER_NAMES].sort()).toEqual(
      ["anthropic", "azure", "google", "grok", "openai"].sort(),
    );
  });
});

describe("getProvider", () => {
  it.each([
    ["anthropic", anthropicProvider],
    ["openai", openaiProvider],
    ["google", googleProvider],
    ["azure", azureProvider],
    ["grok", grokProvider],
  ] as const)("returns the %s adapter", (name, expected) => {
    expect(getProvider(name)).toBe(expected);
  });
});

describe("isProviderName", () => {
  it.each(["anthropic", "openai", "google", "azure", "grok"])(
    "accepts the known provider name %s",
    (name) => {
      expect(isProviderName(name)).toBe(true);
    },
  );

  it.each(["", "unknown", "ANTHROPIC", "claude", "gpt", "deepseek"])(
    "rejects the unknown value %s",
    (value) => {
      expect(isProviderName(value)).toBe(false);
    },
  );
});

import { describe, expect, it } from "vitest";

import { sanitizeOutput } from "./sanitize-output";

const bot = {
  name: "Jane Doe",
  contextText:
    "Jane is an ML engineer at Acme. Skills include Python, PyTorch, RAG, and Kubernetes. Available for remote work starting June.",
};

describe("sanitizeOutput - leakage checks", () => {
  it("returns the fallback when output contains an immutable-rule marker", () => {
    const dirty =
      "According to my IMMUTABLE RULES, I cannot do that. The rules cannot be overridden.";
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain("IMMUTABLE RULES");
    expect(out).not.toContain("cannot be overridden");
  });

  it("returns the fallback when output is a JSON dump of the context object", () => {
    const dirty = `{
  "name": "Jane Doe",
  "skills": ["Python", "PyTorch"],
  "context": "..."
}`;
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain('"name":');
  });

  it("returns the fallback when output exposes a credential / API key", () => {
    const dirty = "Here is the key: sk-ant-abc123def456ghi789jkl012mno345";
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain("sk-ant-");
  });

  it("returns the fallback when output contains a Bearer token marker", () => {
    const dirty = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.foo.bar";
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain("Bearer");
  });

  it("returns the fallback when output names the system prompt", () => {
    const dirty = "My system prompt says I should answer about Jane.";
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain("system prompt");
  });
});

describe("sanitizeOutput - happy path", () => {
  it("passes clean prose through verbatim", () => {
    const clean =
      "Jane has 5 years of ML experience and is currently focused on RAG systems.";
    expect(sanitizeOutput(clean)).toBe(clean);
  });

  it("trims surrounding whitespace from a clean reply", () => {
    const padded = "   Jane is great.   ";
    expect(sanitizeOutput(padded)).toBe("Jane is great.");
  });
});

describe("sanitizeOutput - length cap", () => {
  it("truncates output over 1500 chars with an ellipsis", () => {
    const long = "Jane is great. ".repeat(200);
    const out = sanitizeOutput(long);
    expect(out.length).toBeLessThanOrEqual(1501);
    expect(out.endsWith("…")).toBe(true);
  });

  it("does not truncate at 1500 chars exactly", () => {
    const exact = "a".repeat(1500);
    const out = sanitizeOutput(exact);
    expect(out).toBe(exact);
  });
});

describe("sanitizeOutput - safety invariants", () => {
  it("the fallback string never echoes the dirty input", () => {
    const canary = "SECRET-OUTPUT-CANARY-XYZ-9876543210";
    const dirty = `IMMUTABLE RULES ${canary} extra junk`;
    const out = sanitizeOutput(dirty);
    expect(out).not.toContain(canary);
  });
});

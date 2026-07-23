import { describe, expect, it } from "vitest";

import {
  PERSONALITY_PROMPTS,
  buildSystemPrompt,
} from "./prompt-builder";

const baseBot = {
  name: "Jane Doe",
  personality: "professional" as const,
  contextText: "Jane is an ML engineer with 5 years at Acme building RAG.",
};

describe("buildSystemPrompt", () => {
  it("includes the bot name in the identity line", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    expect(prompt).toMatch(/Jane Doe/);
  });

  it("includes all 7 immutable rules", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    const numberedLines = prompt.match(/^\s*\d+\.\s/gm) ?? [];
    expect(numberedLines.length).toBeGreaterThanOrEqual(7);
  });

  it("injects the personality prose block matching bot.personality", () => {
    for (const personality of [
      "professional",
      "creative",
      "enthusiastic",
    ] as const) {
      const prompt = buildSystemPrompt({
        bot: { ...baseBot, personality },
        ownerUsername: "jane",
      });
      expect(prompt).toContain(PERSONALITY_PROMPTS[personality]);
    }
  });

  it("embeds the bot context verbatim under a ## CONTEXT header", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    expect(prompt).toContain("## CONTEXT");
    expect(prompt).toContain(baseBot.contextText);
  });

  it("never JSON-serializes the bot object (context stays plain text)", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    expect(prompt).not.toMatch(/"contextText"\s*:/);
    expect(prompt).not.toMatch(/^\s*\{\s*"/m);
  });

  it("uses relevantChunks under ## CONTEXT when provided, dropping bot.contextText", () => {
    const prompt = buildSystemPrompt({
      bot: baseBot,
      ownerUsername: "jane",
      relevantChunks: [
        "Jane led the team that shipped Acme's RAG search.",
        "She mentored 4 junior engineers in 2025.",
      ],
    });
    expect(prompt).toContain("## CONTEXT");
    expect(prompt).toContain("Jane led the team that shipped Acme's RAG search.");
    expect(prompt).toContain("She mentored 4 junior engineers in 2025.");
    expect(prompt).toContain("\n\n---\n\n");
    expect(prompt).not.toContain(baseBot.contextText);
  });

  it("falls back to bot.contextText when relevantChunks is empty array", () => {
    const prompt = buildSystemPrompt({
      bot: baseBot,
      ownerUsername: "jane",
      relevantChunks: [],
    });
    expect(prompt).toContain(baseBot.contextText);
  });

  it("puts identity → rules → personality → context in that order", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    const identityIdx = prompt.indexOf("Jane Doe");
    const rulesIdx = prompt.search(/^\s*1\.\s/m);
    const personalityIdx = prompt.indexOf(PERSONALITY_PROMPTS.professional);
    const contextIdx = prompt.indexOf("## CONTEXT");
    expect(identityIdx).toBeGreaterThanOrEqual(0);
    expect(identityIdx).toBeLessThan(rulesIdx);
    expect(rulesIdx).toBeLessThan(personalityIdx);
    expect(personalityIdx).toBeLessThan(contextIdx);
  });
});

describe("buildSystemPrompt - customInstructions (Stage 7 §FR-002.7)", () => {
  it("omits the custom-instructions block when the field is null/missing", () => {
    const prompt = buildSystemPrompt({ bot: baseBot, ownerUsername: "jane" });
    expect(prompt).not.toContain("## CUSTOM INSTRUCTIONS");
  });

  it("omits the custom-instructions block for whitespace-only input", () => {
    const prompt = buildSystemPrompt({
      bot: { ...baseBot, customInstructions: "   \n  \t  " },
      ownerUsername: "jane",
    });
    expect(prompt).not.toContain("## CUSTOM INSTRUCTIONS");
  });

  it("injects the custom-instructions block when non-empty", () => {
    const prompt = buildSystemPrompt({
      bot: {
        ...baseBot,
        customInstructions: "Always mention that she prefers async work.",
      },
      ownerUsername: "jane",
    });
    expect(prompt).toContain("## CUSTOM INSTRUCTIONS");
    expect(prompt).toContain("Always mention that she prefers async work.");
  });

  it("places custom instructions between personality and response style", () => {
    const prompt = buildSystemPrompt({
      bot: {
        ...baseBot,
        customInstructions: "BANANA-FLAVOURED-MARKER-TEXT",
      },
      ownerUsername: "jane",
    });
    const personalityIdx = prompt.indexOf(PERSONALITY_PROMPTS.professional);
    const customIdx = prompt.indexOf("BANANA-FLAVOURED-MARKER-TEXT");
    const responseStyleIdx = prompt.indexOf("## RESPONSE STYLE");
    expect(personalityIdx).toBeLessThan(customIdx);
    expect(customIdx).toBeLessThan(responseStyleIdx);
  });

  it("trims surrounding whitespace from custom instructions", () => {
    const prompt = buildSystemPrompt({
      bot: {
        ...baseBot,
        customInstructions: "\n\n  Be polite.  \n\n",
      },
      ownerUsername: "jane",
    });
    expect(prompt).toMatch(/## CUSTOM INSTRUCTIONS\nBe polite\.\n/);
  });
});

describe("PERSONALITY_PROMPTS", () => {
  it("has a non-empty prose block for each preset", () => {
    for (const personality of [
      "professional",
      "creative",
      "enthusiastic",
    ] as const) {
      expect(PERSONALITY_PROMPTS[personality].length).toBeGreaterThan(20);
    }
  });
});

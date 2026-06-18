import { describe, expect, it } from "vitest";

import { botInput } from "./schemas";

const validInput = {
  name: "Jane Doe",
  headline: "ML Engineer · Open to roles",
  personality: "professional" as const,
  contextText: "I am an ML engineer with 5 years experience.",
  suggestedQuestions: ["What are her top skills?", "Is she remote-friendly?"],
  llmProvider: "anthropic" as const,
  llmModel: "claude-haiku-4-5",
};

describe("botInput - happy path", () => {
  it("accepts a fully-formed valid payload", () => {
    expect(botInput.safeParse(validInput).success).toBe(true);
  });

  it("accepts an empty headline (optional)", () => {
    const { success } = botInput.safeParse({ ...validInput, headline: "" });
    expect(success).toBe(true);
  });

  it("accepts an empty suggestedQuestions array", () => {
    const { success } = botInput.safeParse({
      ...validInput,
      suggestedQuestions: [],
    });
    expect(success).toBe(true);
  });

  it("accepts a null/absent llmModel (provider default applies)", () => {
    const { success } = botInput.safeParse({
      ...validInput,
      llmModel: undefined,
    });
    expect(success).toBe(true);
  });
});

describe("botInput - name validation", () => {
  it.each([
    ["empty name", ""],
    ["whitespace-only name", "   "],
    ["overlong name (101 chars)", "a".repeat(101)],
  ])("rejects %s", (_label, name) => {
    expect(botInput.safeParse({ ...validInput, name }).success).toBe(false);
  });
});

describe("botInput - headline validation", () => {
  it("rejects an overlong headline (121 chars)", () => {
    expect(
      botInput.safeParse({ ...validInput, headline: "a".repeat(121) }).success,
    ).toBe(false);
  });
});

describe("botInput - contextText validation", () => {
  it("rejects empty contextText", () => {
    expect(botInput.safeParse({ ...validInput, contextText: "" }).success).toBe(
      false,
    );
  });

  it("rejects whitespace-only contextText", () => {
    expect(
      botInput.safeParse({ ...validInput, contextText: "   " }).success,
    ).toBe(false);
  });

  it("rejects contextText over 50,000 chars", () => {
    expect(
      botInput.safeParse({ ...validInput, contextText: "a".repeat(50_001) })
        .success,
    ).toBe(false);
  });
});

describe("botInput - personality enum", () => {
  it.each([["professional"], ["creative"], ["enthusiastic"]])(
    "accepts personality=%s",
    (personality) => {
      expect(botInput.safeParse({ ...validInput, personality }).success).toBe(
        true,
      );
    },
  );

  it("rejects an unknown personality", () => {
    expect(
      botInput.safeParse({ ...validInput, personality: "sarcastic" }).success,
    ).toBe(false);
  });
});

describe("botInput - llmProvider enum", () => {
  it.each([["anthropic"], ["openai"], ["google"], ["azure"]])(
    "accepts llmProvider=%s",
    (llmProvider) => {
      expect(botInput.safeParse({ ...validInput, llmProvider }).success).toBe(
        true,
      );
    },
  );

  it("rejects an unknown provider", () => {
    expect(
      botInput.safeParse({ ...validInput, llmProvider: "cohere" }).success,
    ).toBe(false);
  });
});

describe("botInput - suggestedQuestions", () => {
  it("rejects more than 6 suggested questions", () => {
    const seven = Array.from({ length: 7 }, (_, i) => `Q${i}`);
    expect(
      botInput.safeParse({ ...validInput, suggestedQuestions: seven }).success,
    ).toBe(false);
  });

  it("rejects an individual question longer than 200 chars", () => {
    expect(
      botInput.safeParse({
        ...validInput,
        suggestedQuestions: ["a".repeat(201)],
      }).success,
    ).toBe(false);
  });
});

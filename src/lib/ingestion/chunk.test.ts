import { afterAll, describe, expect, it } from "vitest";

import { __resetEncoder, chunkText } from "./chunk";
import { IngestionError } from "./errors";

afterAll(() => {
  __resetEncoder();
});

describe("chunkText", () => {
  it("throws IngestionError('empty_input') on empty string", () => {
    expect(() => chunkText("")).toThrow(IngestionError);
    expect(() => chunkText("")).toThrow(/empty/i);
  });

  it("throws IngestionError('empty_input') on whitespace-only string", () => {
    try {
      chunkText("   \n\t  ");
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(IngestionError);
      expect((e as IngestionError).category).toBe("empty_input");
    }
  });

  it("returns a single chunk when token count <= target", () => {
    const text = "Hello world. This is a short paragraph.";
    const chunks = chunkText(text, { targetTokens: 100, overlapTokens: 10 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.chunkIndex).toBe(0);
    expect(chunks[0]!.contentText).toBe(text);
    expect(chunks[0]!.tokenCount).toBeGreaterThan(0);
    expect(chunks[0]!.tokenCount).toBeLessThanOrEqual(100);
  });

  it("trims surrounding whitespace before chunking", () => {
    const chunks = chunkText("  \n  hello world  \n  ", {
      targetTokens: 50,
      overlapTokens: 5,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.contentText).toBe("hello world");
  });

  it("splits long text into multiple chunks with monotonic chunkIndex", () => {
    const sentence = "The quick brown fox jumps over the lazy dog. ";
    const longText = sentence.repeat(200); // far over any small target
    const chunks = chunkText(longText, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i);
      expect(c.tokenCount).toBeGreaterThan(0);
      expect(c.tokenCount).toBeLessThanOrEqual(100);
      expect(c.contentText.length).toBeGreaterThan(0);
    });
  });

  it("overlaps adjacent chunks by approximately overlapTokens", () => {
    const text = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
    const target = 80;
    const overlap = 20;
    const chunks = chunkText(text, {
      targetTokens: target,
      overlapTokens: overlap,
    });
    expect(chunks.length).toBeGreaterThan(2);
    // Tail of chunk[i] should share tokens with head of chunk[i+1].
    // Verify by checking that some words appear in both consecutive chunks.
    for (let i = 0; i < chunks.length - 1; i += 1) {
      const a = chunks[i]!.contentText.split(/\s+/);
      const b = chunks[i + 1]!.contentText.split(/\s+/);
      const aTail = new Set(a.slice(-overlap));
      const overlapping = b.slice(0, overlap).filter((w) => aTail.has(w));
      expect(overlapping.length).toBeGreaterThan(0);
    }
  });

  it("covers all source text across the union of chunks", () => {
    const words = Array.from({ length: 300 }, (_, i) => `tok${i}`).join(" ");
    const chunks = chunkText(words, { targetTokens: 60, overlapTokens: 10 });
    const joined = chunks.map((c) => c.contentText).join(" ");
    // Every distinct source word should appear somewhere in the chunks
    for (let i = 0; i < 300; i += 1) {
      expect(joined).toContain(`tok${i}`);
    }
  });

  it("rejects invalid options", () => {
    expect(() => chunkText("hello", { targetTokens: 0 })).toThrow(
      /targetTokens/,
    );
    expect(() =>
      chunkText("hello", { targetTokens: 10, overlapTokens: 10 }),
    ).toThrow(/overlapTokens/);
    expect(() =>
      chunkText("hello", { targetTokens: 10, overlapTokens: -1 }),
    ).toThrow(/overlapTokens/);
  });
});


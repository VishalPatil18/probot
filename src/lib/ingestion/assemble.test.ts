import { describe, expect, it } from "vitest";

import { type AssembledChunk, assembleFromChunks } from "./assemble";

const chunk = (
  sourceName: string,
  chunkIndex: number,
  contentText: string,
  tokenCount: number,
): AssembledChunk => ({ sourceName, chunkIndex, contentText, tokenCount });

describe("assembleFromChunks", () => {
  it("returns empty result for empty input", () => {
    const r = assembleFromChunks([], 1000);
    expect(r.text).toBe("");
    expect(r.totalTokens).toBe(0);
    expect(r.truncated).toBe(false);
  });

  it("orders by (sourceName, chunkIndex) deterministically", () => {
    const chunks: AssembledChunk[] = [
      chunk("b.pdf", 0, "B0", 1),
      chunk("a.pdf", 1, "A1", 1),
      chunk("a.pdf", 0, "A0", 1),
      chunk("b.pdf", 1, "B1", 1),
    ];
    const r = assembleFromChunks(chunks, 1000);
    expect(r.text).toBe(["A0", "A1", "B0", "B1"].join("\n\n"));
    expect(r.totalTokens).toBe(4);
    expect(r.truncated).toBe(false);
  });

  it("joins parts with a blank line separator", () => {
    const r = assembleFromChunks(
      [chunk("a", 0, "first", 1), chunk("a", 1, "second", 1)],
      1000,
    );
    expect(r.text).toBe("first\n\nsecond");
  });

  it("stops and marks truncated when adding next chunk would exceed cap", () => {
    const chunks: AssembledChunk[] = [
      chunk("a", 0, "alpha", 5),
      chunk("a", 1, "beta", 5),
      chunk("a", 2, "gamma", 5),
    ];
    const r = assembleFromChunks(chunks, 7);
    expect(r.text).toBe("alpha");
    expect(r.totalTokens).toBe(5);
    expect(r.truncated).toBe(true);
  });

  it("fills exactly to cap without marking truncated", () => {
    const chunks: AssembledChunk[] = [
      chunk("a", 0, "x", 3),
      chunk("a", 1, "y", 4),
    ];
    const r = assembleFromChunks(chunks, 7);
    expect(r.text).toBe("x\n\ny");
    expect(r.totalTokens).toBe(7);
    expect(r.truncated).toBe(false);
  });

  it("returns empty + truncated=true when first chunk alone exceeds cap", () => {
    const r = assembleFromChunks([chunk("a", 0, "huge", 1000)], 100);
    expect(r.text).toBe("");
    expect(r.totalTokens).toBe(0);
    expect(r.truncated).toBe(true);
  });

  it("returns empty + truncated=true when cap is 0 with non-empty input", () => {
    const r = assembleFromChunks([chunk("a", 0, "x", 1)], 0);
    expect(r.text).toBe("");
    expect(r.totalTokens).toBe(0);
    expect(r.truncated).toBe(true);
  });

  it("returns empty + truncated=false when cap is 0 with empty input", () => {
    const r = assembleFromChunks([], 0);
    expect(r.text).toBe("");
    expect(r.totalTokens).toBe(0);
    expect(r.truncated).toBe(false);
  });

  it("does not mutate the input array", () => {
    const chunks: AssembledChunk[] = [
      chunk("b", 0, "B", 1),
      chunk("a", 0, "A", 1),
    ];
    const snapshot = chunks.map((c) => ({ ...c }));
    assembleFromChunks(chunks, 1000);
    expect(chunks).toEqual(snapshot);
  });
});

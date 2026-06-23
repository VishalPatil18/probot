import { describe, expect, it } from "vitest";

import { groupBy } from "./export";

// `groupBy` is the core of the O(n) export-bundling refactor: it buckets child
// rows by their owning bot in one pass (replacing the old O(bots × rows) join).

describe("groupBy", () => {
  it("buckets rows by their key in a single pass", () => {
    const rows = [
      { id: "k1", botId: "a" },
      { id: "k2", botId: "b" },
      { id: "k3", botId: "a" },
    ];
    const grouped = groupBy(rows, (r) => r.botId);
    expect(grouped.get("a")?.map((r) => r.id)).toEqual(["k1", "k3"]);
    expect(grouped.get("b")?.map((r) => r.id)).toEqual(["k2"]);
    expect(grouped.get("c")).toBeUndefined();
  });

  it("skips rows whose derived key is undefined", () => {
    // Mirrors a message whose conversation isn't in scope: the conversation→bot
    // lookup returns undefined, so the message must be dropped, not grouped.
    const messages = [
      { id: "m1", conversationId: "c1" },
      { id: "m2", conversationId: "missing" },
    ];
    const conversationToBot = new Map([["c1", "bot-1"]]);
    const grouped = groupBy(messages, (m) =>
      conversationToBot.get(m.conversationId),
    );
    expect(grouped.get("bot-1")?.map((m) => m.id)).toEqual(["m1"]);
    expect([...grouped.values()].flat()).toHaveLength(1);
  });

  it("returns an empty map for no rows", () => {
    expect(groupBy([], () => "x").size).toBe(0);
  });
});

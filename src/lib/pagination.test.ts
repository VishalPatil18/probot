import { describe, expect, it } from "vitest";

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  parsePagination,
} from "./pagination";

function sp(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

describe("parsePagination", () => {
  it("returns defaults when no params are supplied", () => {
    const result = parsePagination(sp({}));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pagination.page).toBe(DEFAULT_PAGE);
      expect(result.pagination.limit).toBe(DEFAULT_LIMIT);
      expect(result.pagination.offset).toBe(0);
    }
  });

  it("computes offset = (page - 1) * limit", () => {
    const result = parsePagination(sp({ page: "3", limit: "25" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pagination.offset).toBe(50);
    }
  });

  it("rejects page < 1", async () => {
    const result = parsePagination(sp({ page: "0" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = (await result.response.json()) as {
        error: string;
        field: string;
      };
      expect(body.error).toBe("invalid_pagination");
      expect(body.field).toBe("page");
    }
  });

  it("rejects non-integer page", () => {
    const result = parsePagination(sp({ page: "1.5" }));
    expect(result.ok).toBe(false);
  });

  it("rejects non-numeric page", () => {
    const result = parsePagination(sp({ page: "abc" }));
    expect(result.ok).toBe(false);
  });

  it("rejects limit > MAX_LIMIT", async () => {
    const result = parsePagination(sp({ limit: String(MAX_LIMIT + 1) }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = (await result.response.json()) as {
        error: string;
        field: string;
      };
      expect(body.field).toBe("limit");
    }
  });

  it("rejects limit < 1", () => {
    const result = parsePagination(sp({ limit: "0" }));
    expect(result.ok).toBe(false);
  });

  it("respects opts.maxLimit override", () => {
    const big = parsePagination(sp({ limit: "1000" }), { maxLimit: 1000 });
    expect(big.ok).toBe(true);
    const over = parsePagination(sp({ limit: "5" }), { maxLimit: 3 });
    expect(over.ok).toBe(false);
  });

  it("respects opts.defaultLimit override when limit param is absent", () => {
    const result = parsePagination(sp({}), { defaultLimit: 50 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pagination.limit).toBe(50);
  });
});

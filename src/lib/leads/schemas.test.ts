import { describe, expect, it } from "vitest";

import { LEAD_CONTEXT_SUMMARY_MAX, leadCaptureInput } from "./schemas";

describe("leadCaptureInput", () => {
  it("accepts a valid email + optional fields", () => {
    const result = leadCaptureInput.safeParse({
      email: "Jane.Doe@Example.COM",
      conversationId: "11111111-1111-1111-1111-111111111111",
      contextSummary: "asked about ML experience",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // lowercased + trimmed → idempotent dedupe key
      expect(result.data.email).toBe("jane.doe@example.com");
    }
  });

  it("trims whitespace around email", () => {
    const result = leadCaptureInput.safeParse({ email: "  a@b.com  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("a@b.com");
  });

  it("rejects malformed email", () => {
    expect(leadCaptureInput.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects non-UUID conversationId", () => {
    expect(
      leadCaptureInput.safeParse({
        email: "a@b.com",
        conversationId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects oversized contextSummary", () => {
    expect(
      leadCaptureInput.safeParse({
        email: "a@b.com",
        contextSummary: "x".repeat(LEAD_CONTEXT_SUMMARY_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects email > 255 chars", () => {
    // 251 + "@b.co" (5) = 256 total → exceeds the cap
    const long = `${"x".repeat(251)}@b.co`;
    expect(leadCaptureInput.safeParse({ email: long }).success).toBe(false);
  });

  it("allows omitting both optional fields", () => {
    expect(leadCaptureInput.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { LEAD_CONTEXT_SUMMARY_MAX, leadCaptureInput } from "./schemas";

const REQUIRED = { name: "Jane Doe", company: "Acme Inc" };

describe("leadCaptureInput", () => {
  it("accepts required fields + optional fields", () => {
    const result = leadCaptureInput.safeParse({
      ...REQUIRED,
      email: "Jane.Doe@Example.COM",
      linkedinUrl: "https://linkedin.com/in/jane",
      conversationId: "11111111-1111-1111-1111-111111111111",
      contextSummary: "asked about ML experience",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane.doe@example.com");
    }
  });

  it("trims whitespace around email", () => {
    const result = leadCaptureInput.safeParse({
      ...REQUIRED,
      email: "  a@b.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("a@b.com");
  });

  it("requires name and company", () => {
    expect(leadCaptureInput.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(
      leadCaptureInput.safeParse({ name: "Jane", email: "a@b.com" }).success,
    ).toBe(false);
  });

  it("rejects malformed email", () => {
    expect(
      leadCaptureInput.safeParse({ ...REQUIRED, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects an invalid LinkedIn URL but allows an empty string", () => {
    expect(
      leadCaptureInput.safeParse({
        ...REQUIRED,
        email: "a@b.com",
        linkedinUrl: "not-a-url",
      }).success,
    ).toBe(false);
    expect(
      leadCaptureInput.safeParse({
        ...REQUIRED,
        email: "a@b.com",
        linkedinUrl: "",
      }).success,
    ).toBe(true);
  });

  it("rejects non-UUID conversationId", () => {
    expect(
      leadCaptureInput.safeParse({
        ...REQUIRED,
        email: "a@b.com",
        conversationId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects oversized contextSummary", () => {
    expect(
      leadCaptureInput.safeParse({
        ...REQUIRED,
        email: "a@b.com",
        contextSummary: "x".repeat(LEAD_CONTEXT_SUMMARY_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects email > 255 chars", () => {
    const long = `${"x".repeat(251)}@b.co`;
    expect(
      leadCaptureInput.safeParse({ ...REQUIRED, email: long }).success,
    ).toBe(false);
  });

  it("allows omitting the optional fields", () => {
    expect(
      leadCaptureInput.safeParse({ ...REQUIRED, email: "a@b.com" }).success,
    ).toBe(true);
  });
});

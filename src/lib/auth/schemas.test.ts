import { describe, expect, it } from "vitest";

import { registerInput, RESERVED_SLUGS, USERNAME_REGEX } from "./schemas";

const baseValid = {
  username: "jane-doe",
  email: "jane@example.com",
  password: "hunter2hunter",
};

describe("registerInput", () => {
  it("accepts a valid payload", () => {
    expect(registerInput.safeParse(baseValid).success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = registerInput.safeParse({
      ...baseValid,
      password: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = registerInput.safeParse({
      ...baseValid,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects uppercase usernames", () => {
    const result = registerInput.safeParse({
      ...baseValid,
      username: "Jane-Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects usernames with a leading hyphen", () => {
    const result = registerInput.safeParse({ ...baseValid, username: "-jane" });
    expect(result.success).toBe(false);
  });

  it("rejects usernames with a trailing hyphen", () => {
    const result = registerInput.safeParse({ ...baseValid, username: "jane-" });
    expect(result.success).toBe(false);
  });

  it("rejects usernames shorter than 3 characters", () => {
    const result = registerInput.safeParse({ ...baseValid, username: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects underscores in usernames", () => {
    const result = registerInput.safeParse({
      ...baseValid,
      username: "jane_doe",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "admin",
    "api",
    "dashboard",
    "login",
    "register",
    "widget",
    "u",
    "settings",
  ])("rejects reserved slug %s", (slug) => {
    const result = registerInput.safeParse({ ...baseValid, username: slug });
    expect(result.success).toBe(false);
  });
});

describe("USERNAME_REGEX", () => {
  it.each(["jane-doe", "user123", "a1b", "abc"])("matches %s", (value) => {
    expect(USERNAME_REGEX.test(value)).toBe(true);
  });

  it.each(["Jane-Doe", "-jane", "jane-", "ab", "jane_doe", "jane.doe"])(
    "rejects %s",
    (value) => {
      expect(USERNAME_REGEX.test(value)).toBe(false);
    },
  );
});

describe("RESERVED_SLUGS", () => {
  it("contains the slugs from claude/plan.md §4.6", () => {
    for (const slug of [
      "admin",
      "api",
      "dashboard",
      "login",
      "register",
      "widget",
      "u",
      "settings",
    ]) {
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
    }
  });
});

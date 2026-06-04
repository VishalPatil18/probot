import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./passwords";

describe("hashPassword / verifyPassword", () => {
  it("produces a bcrypt hash string at cost 10", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2hunter");
    await expect(verifyPassword("hunter2hunter", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("hunter2hunter");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (salting)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

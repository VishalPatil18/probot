import { describe, expect, it } from "vitest";

import {
  ANIMAL_AVATARS,
  isAllowedAvatar,
  pickDefaultAvatar,
} from "./avatars";

describe("ANIMAL_AVATARS", () => {
  it("has 13 curated entries (Cloudinary URLs)", () => {
    expect(ANIMAL_AVATARS).toHaveLength(13);
    for (const url of ANIMAL_AVATARS) {
      expect(url.startsWith("https://res.cloudinary.com/")).toBe(true);
    }
  });

  it("entries are unique", () => {
    expect(new Set(ANIMAL_AVATARS).size).toBe(ANIMAL_AVATARS.length);
  });
});

describe("pickDefaultAvatar", () => {
  it("returns one of the curated URLs", () => {
    const url = pickDefaultAvatar("any-seed");
    expect(ANIMAL_AVATARS).toContain(url);
  });

  it("is deterministic — same seed always returns the same URL", () => {
    expect(pickDefaultAvatar("jane-doe")).toBe(pickDefaultAvatar("jane-doe"));
    expect(pickDefaultAvatar("user-abcdef12")).toBe(
      pickDefaultAvatar("user-abcdef12"),
    );
  });

  it("distributes across multiple avatars (not all one bucket)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      seen.add(pickDefaultAvatar(`user-${i}`));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it("handles empty-string seed without throwing", () => {
    const url = pickDefaultAvatar("");
    expect(ANIMAL_AVATARS).toContain(url);
  });
});

describe("isAllowedAvatar", () => {
  it("returns true for every curated URL", () => {
    for (const url of ANIMAL_AVATARS) {
      expect(isAllowedAvatar(url)).toBe(true);
    }
  });

  it("returns false for arbitrary URLs", () => {
    expect(isAllowedAvatar("https://evil.com/spoof.png")).toBe(false);
    expect(
      isAllowedAvatar(
        "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1/Portfolio4.0/99_fake.webp",
      ),
    ).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAllowedAvatar("")).toBe(false);
  });
});

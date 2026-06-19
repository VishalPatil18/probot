// Stage 4 plan.md §4: default animal-icon avatars for users without a
// profile photo (OAuth providers that don't return one, credentials users,
// magic-link users). Hosted on Cloudinary; the operator pays nothing.
//
// Auto-assigned at signup (NextAuth adapter override + credentials register
// route). Users can change their selection in the onboarding flow when their
// username is still a placeholder; Stage 7 ships a general profile editor.

export const ANIMAL_AVATARS = [
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587321/Portfolio4.0/1_kf7bud.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587322/Portfolio4.0/2_ydovee.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587323/Portfolio4.0/3_vttit1.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587324/Portfolio4.0/4_eltfta.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587324/Portfolio4.0/5_i0mqh0.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587325/Portfolio4.0/6_xvx4t5.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587326/Portfolio4.0/7_wkb5no.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587327/Portfolio4.0/8_bktxxl.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587328/Portfolio4.0/9_wils8f.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587329/Portfolio4.0/10_prfgdz.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587330/Portfolio4.0/11_obfrpg.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587331/Portfolio4.0/12_nwj2vi.webp",
  "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1777587331/Portfolio4.0/13_cqvkxf.webp",
] as const;

export const AVATAR_HOSTNAME = "res.cloudinary.com";

const AVATAR_SET: ReadonlySet<string> = new Set(ANIMAL_AVATARS);

// First avatar is the documented fallback — pulled out as a const so the
// signature of pickDefaultAvatar is `string` (not `string | undefined`)
// under `noUncheckedIndexedAccess`. The runtime modulo math always lands
// in-bounds; the `?? FALLBACK_AVATAR` branch is purely for the type system.
const FALLBACK_AVATAR: string = ANIMAL_AVATARS[0];

// Deterministic per-user default. The same seed (user id) always returns the
// same animal so re-renders and re-derivations match. The distribution is
// good enough for an aesthetic default — not a security primitive.
export function pickDefaultAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[index] ?? FALLBACK_AVATAR;
}

// True when `url` is one of the curated animal-icon URLs. Used by the
// onboarding PATCH to allowlist what users can submit as their avatar.
// External URLs (e.g. OAuth-provided photos) must be retained via the
// "current value" branch of the validator, not by passing this check.
export function isAllowedAvatar(url: string): boolean {
  return AVATAR_SET.has(url);
}

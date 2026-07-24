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

const FALLBACK_AVATAR: string = ANIMAL_AVATARS[0];

export function pickDefaultAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[index] ?? FALLBACK_AVATAR;
}

export function isAllowedAvatar(url: string): boolean {
  return AVATAR_SET.has(url);
}

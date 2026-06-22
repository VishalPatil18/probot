import type { MetadataRoute } from "next";

// Static sitemap of public marketing routes. Next.js serves this at
// /sitemap.xml. Base URL follows the same env convention as the rest of the
// app (NEXTAUTH_URL → APP_URL → localhost) so it stays correct per-deploy.
const BASE_URL = (
  process.env.NEXTAUTH_URL ??
  process.env.APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const ROUTES = [
  "/",
  "/why-pro-bot",
  "/roadmap",
  "/hire-me",
  "/about",
  "/self-hosting",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
  }));
}

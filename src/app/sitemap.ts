import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

// Static sitemap of public marketing routes. Next.js serves this at
// /sitemap.xml. Base URL is shared with robots.ts + the metadata layer.
const BASE_URL = siteUrl();

const ROUTES = [
  "/",
  "/why-pro-bot",
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

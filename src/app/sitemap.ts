import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

const BASE_URL = siteUrl();

const ROUTES = [
  "/",
  "/why-pro-bot",
  "/hire-me",
  "/about",
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

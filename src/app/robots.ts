import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

// Served at /robots.txt. Lets crawlers index the public marketing + public bot
// pages while keeping authenticated and API surfaces out of the index, and
// points them at the sitemap for discovery.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api",
        "/login",
        "/register",
        "/reset-password",
        "/onboarding",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

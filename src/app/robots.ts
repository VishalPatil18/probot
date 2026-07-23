import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

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

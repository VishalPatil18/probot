import type { Metadata } from "next";

export const SITE_NAME = "ProBot";
export const SITE_TITLE = "ProBot - Your AI Assistant for job seekers";
export const SITE_DESCRIPTION =
  "Free, open-source, BYO-key AI chatbots for job seekers. Turn your resume into an AI assistant recruiters can chat with - your key, your data, self-hostable.";

export function siteUrl(): string {
  const base =
    process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

interface BuildMetadataArgs {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  index = true,
}: BuildMetadataArgs): Metadata {
  const url = `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}

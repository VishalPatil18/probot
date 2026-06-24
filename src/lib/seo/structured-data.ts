import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "./site";

// JSON-LD structured data for the landing page. Two graphs help search engines
// understand the brand (Organization) and the product (SoftwareApplication, a
// free web app) - which can unlock richer SERP treatment.

const GITHUB_URL = "https://github.com/VishalPatil18";
const LINKEDIN_URL = "https://www.linkedin.com/in/vishalrameshpatil/";

export function organizationJsonLd(): Record<string, unknown> {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    logo: `${url}/icon.svg`,
    description: SITE_DESCRIPTION,
    sameAs: [GITHUB_URL, LINKEDIN_URL],
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

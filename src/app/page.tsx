import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { DocsCtaSection } from "@/components/marketing/sections/DocsCtaSection";
import { FeaturesSection } from "@/components/marketing/sections/FeaturesSection";
import { FreeToUseSection } from "@/components/marketing/sections/FreeToUseSection";
import { HeroSection } from "@/components/marketing/sections/HeroSection";
import { HowItWorksSection } from "@/components/marketing/sections/HowItWorksSection";
import { LivePipelineSection } from "@/components/marketing/sections/LivePipelineSection";
import { TrustStrip } from "@/components/marketing/sections/TrustStrip";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo/structured-data";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />
      <SiteHeader />

      <main>
        <HeroSection />
        <TrustStrip />
        <LivePipelineSection />
        <HowItWorksSection />
        <FeaturesSection />
        <FreeToUseSection />
        <DocsCtaSection />
      </main>

      <SiteFooter />
    </>
  );
}

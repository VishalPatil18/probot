/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Stage 4: Cloudinary hosts the curated animal-icon avatars used as the
    // default users.image. The allowlist is intentionally narrow — any future
    // remote source (e.g. profile-photo upload in Stage 6) gets added here
    // explicitly so we never proxy arbitrary URLs through the Next image
    // optimizer.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dbjdu0hvl/**",
      },
    ],
  },
  // Stage 5: CORS headers on the two public endpoints called by the
  // embeddable widget. `next.config.js` headers apply to GET/POST responses
  // automatically; preflight OPTIONS is handled by explicit `OPTIONS` exports
  // in each route handler. Mirror of src/lib/bots/cors-headers.ts —
  // intentionally duplicated because the headers() runtime cannot import TS.
  async headers() {
    const corsHeaders = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
      {
        key: "Access-Control-Allow-Headers",
        value:
          "Content-Type, x-llm-api-key, x-embedding-api-key, x-llm-azure-endpoint, x-llm-azure-api-version",
      },
      { key: "Access-Control-Max-Age", value: "86400" },
    ];
    return [
      { source: "/api/chat/:botId", headers: corsHeaders },
      { source: "/api/bots/:botId/config", headers: corsHeaders },
    ];
  },
  async rewrites() {
    return [
      { source: "/docs", destination: "https://probot.mintlify.dev/docs" },
      {
        source: "/docs/:path*",
        destination: "https://probot.mintlify.dev/docs/:path*",
      },
    ];
  },
};

module.exports = nextConfig;

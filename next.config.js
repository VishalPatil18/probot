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
};

module.exports = nextConfig;

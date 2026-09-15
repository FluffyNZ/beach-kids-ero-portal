/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This project hasn't been through a local `npm run lint` pass yet
    // (see README) — don't let a stray unused import fail `next build`.
    // Run `npm run lint` separately and flip this back to false once clean.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Next's default Server Action body limit is 1MB, which a real phone
      // photo (child photos, evidence, signed paper forms) can easily
      // exceed. Raised so photo uploads from a phone camera don't silently
      // fail partway through.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;

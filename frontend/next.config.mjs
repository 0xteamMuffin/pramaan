/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint is enforced separately via `npm run lint`; do not block production builds
  // on lint-only issues so the demo can always be produced.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep TypeScript type-checking ON during builds (strict quality gate).
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

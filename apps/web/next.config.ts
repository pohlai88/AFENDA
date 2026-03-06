import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Workspace packages are referenced via tsconfig paths pointing at their
  // TypeScript source.  Turbopack needs this to remap ".js" imports inside
  // those packages to ".ts" files at build time.
  transpilePackages: ["@afenda/contracts"],

  // API proxy for local dev (avoids CORS in development)
  async rewrites() {
    return [
      {
        source: "/api/internal/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

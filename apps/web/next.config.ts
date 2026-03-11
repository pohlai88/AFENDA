import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,

  // CSS chunking: 'strict' preserves import order — design system tokens
  // must load before Tailwind defaults. Fixes auth pages missing :root/.dark.
  experimental: {
    cssChunking: "strict" as const,
    // Inline CSS in <head> — ensures design tokens reach all routes (avoids
    // chunk-load order issues). Production only; see nextjs.org/docs/.../inlineCss
    inlineCss: true,
    // Enable app/global-not-found.tsx for unmatched URLs at router level.
    globalNotFound: true,
  },

  // Workspace packages are referenced via tsconfig paths pointing at their
  // TypeScript source.  Turbopack needs this to remap ".js" imports inside
  // those packages to ".ts" files at build time.
  // contracts now exports compiled JS from dist/, so no longer transpiled
  transpilePackages: ["@afenda/ui", "@afenda/db", "@afenda/core"],

  // Externalize pg — native Node.js driver; avoids bundling issues
  serverExternalPackages: ["pg"],

  // API proxy for local dev (avoids CORS in development)
  // Exclude /api/internal/security/* — those are Next.js route handlers, not proxied to Fastify.
  async rewrites() {
    return [
      {
        source: "/api/internal/security/:path*",
        destination: "/api/internal/security/:path*",
      },
      {
        source: "/api/internal/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

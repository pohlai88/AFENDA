/**
 * Next.js middleware delegates to proxy for canonical routing.
 */
export { proxy as middleware } from "./proxy";

export const config = {
  matcher: [
    "/afenda",
    "/app/:path*",
    "/portal/:path*",
    "/finance/:path*",
    "/governance/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/api/private/:path*",
  ],
};

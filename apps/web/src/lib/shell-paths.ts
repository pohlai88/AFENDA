const PUBLIC_EXACT = new Set([
  "/",
  "/auth",
  "/portal",
  "/marketing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/pdpa",
  "/status",
  "/cookie-policy",
  "/sla",
]);

const PUBLIC_PREFIXES = ["/auth/", "/portal/", "/marketing/"];

export function isPublicFacingPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname)
    || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

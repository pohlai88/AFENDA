/**
 * Server-only helper to read the NextAuth session token from cookies.
 *
 * Used by api-client to send Authorization: Bearer for API requests.
 * Cookie name varies: next-auth.session-token (HTTP) or
 * __Secure-next-auth.session-token (HTTPS).
 */
export async function getSessionToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  // Load Next server APIs only when actually running on the server.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return (
    store.get("next-auth.session-token")?.value ??
    store.get("__Secure-next-auth.session-token")?.value ??
    null
  );
}

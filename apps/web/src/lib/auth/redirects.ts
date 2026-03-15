export function resolveSafeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/")) {
    return fallback;
  }

  if (value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function buildPostSignInPath(nextPath: string): string {
  const safeNext = resolveSafeRedirectPath(nextPath, "/app");
  return `/auth/post-sign-in?next=${encodeURIComponent(safeNext)}`;
}

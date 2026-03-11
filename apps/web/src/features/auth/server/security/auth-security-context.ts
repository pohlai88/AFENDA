import { headers } from "next/headers";

export interface AuthSecurityContext {
  ipAddress?: string;
  userAgent?: string;
}

export async function getAuthSecurityContext(): Promise<AuthSecurityContext> {
  const h = await headers();

  const forwardedFor = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");
  const userAgent = h.get("user-agent") ?? undefined;

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    undefined;

  return {
    ipAddress,
    userAgent,
  };
}

import type { PortalType } from "@afenda/contracts";
import { getPortalDefaultCallbackUrl, getPortalHomePath } from "./portal-routing";
import { buildSelectOrganizationRedirect } from "@/lib/auth/tenant-context";
import { isTenantRoutingV2Enabled } from "@/lib/feature-flags";

export function normalizeCallbackUrl(callbackUrl?: string | null): string | undefined {
  if (!callbackUrl) return undefined;
  if (!callbackUrl.startsWith("/")) return undefined;
  return callbackUrl;
}

export function resolveOrganizationPostSignInRedirect(
  callbackUrl?: string | null,
): string {
  if (!isTenantRoutingV2Enabled()) {
    return normalizeCallbackUrl(callbackUrl) ?? "/app";
  }

  return buildSelectOrganizationRedirect(normalizeCallbackUrl(callbackUrl) ?? "/app");
}

export function resolvePortalPostSignInRedirect(
  portal: PortalType,
  callbackUrl?: string | null,
): string {
  return (
    normalizeCallbackUrl(callbackUrl) ??
    getPortalDefaultCallbackUrl(portal) ??
    getPortalHomePath(portal)
  );
}

export function buildVerifyRedirect(params: {
  callbackUrl?: string | null;
  mfaToken?: string | null;
}): string {
  const searchParams = new URLSearchParams();

  if (params.callbackUrl) {
    searchParams.set("callbackUrl", params.callbackUrl);
  }

  if (params.mfaToken) {
    searchParams.set("mfaToken", params.mfaToken);
  }

  const query = searchParams.toString();
  return query ? `/auth/verify?${query}` : "/auth/verify";
}

export function resolveVerifyRedirect(callbackUrl?: string | null): string {
  return normalizeCallbackUrl(callbackUrl) ?? "/app";
}

export function resolveInviteRedirect(callbackUrl?: string | null): string {
  return normalizeCallbackUrl(callbackUrl) ?? "/app";
}

import type { PortalType } from "@afenda/contracts";
import { getPortal } from "./portal-registry";

export interface PortalRedirectParams {
  callbackUrl?: string;
  error?: string;
}

export function getPortalSignInPath(portal: PortalType): string {
  return getPortal(portal).signInPath;
}

export function getPortalHomePath(portal: PortalType): string {
  return getPortal(portal).homePath;
}

export function getPortalDefaultCallbackUrl(portal: PortalType): string {
  return getPortal(portal).defaultCallbackUrl;
}

/**
 * Build redirect URL for portal sign-in.
 * Unified flow: /auth/signin?tab=portal&callbackUrl=...
 */
export function buildPortalSignInRedirect(
  portal: PortalType,
  params: PortalRedirectParams = {},
): string {
  const portalConfig = getPortal(portal);
  const searchParams = new URLSearchParams();

  searchParams.set("tab", portal);

  const callbackUrl = params.callbackUrl ?? portalConfig.defaultCallbackUrl;
  searchParams.set("callbackUrl", callbackUrl);

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `${portalConfig.signInPath}?${query}`;
}

import type { PortalType } from "@afenda/contracts";
import type { PortalRedirectParams } from "./auth-types";
import { getPortal } from "./portal-registry";

export function getPortalSignInPath(portal: PortalType): string {
  return getPortal(portal).signInPath;
}

export function getPortalHomePath(portal: PortalType): string {
  return getPortal(portal).homePath;
}

export function getPortalDefaultCallbackUrl(portal: PortalType): string | undefined {
  return getPortal(portal).defaultCallbackUrl;
}

export function buildPortalSignInRedirect(
  portal: PortalType,
  params: PortalRedirectParams = {},
): string {
  const portalConfig = getPortal(portal);
  const searchParams = new URLSearchParams();

  const callbackUrl = params.callbackUrl ?? portalConfig.defaultCallbackUrl;

  if (callbackUrl) {
    searchParams.set("callbackUrl", callbackUrl);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return query ? `${portalConfig.signInPath}?${query}` : portalConfig.signInPath;
}

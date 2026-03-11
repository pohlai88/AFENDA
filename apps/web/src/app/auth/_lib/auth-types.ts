import type { PortalType } from "@afenda/contracts";

export type PortalGroup = "app" | "portals" | "internal";

export interface PortalRedirectParams {
  callbackUrl?: string;
  error?: string;
}

export interface PortalRegistryItem {
  value: PortalType;
  label: string;
  group: PortalGroup;
  shortcut?: string;
  signInPath: string;
  homePath: string;
  defaultCallbackUrl?: string;
  visibleInSwitcher?: boolean;
  internal?: boolean;
}

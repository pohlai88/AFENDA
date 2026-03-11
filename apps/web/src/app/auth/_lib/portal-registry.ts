import type { LucideIcon } from "lucide-react";
import {
  HardHat,
  LayoutDashboard,
  Package,
  Shield,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import type { PortalType } from "@afenda/contracts";
import type { PortalGroup, PortalRegistryItem } from "./auth-types";

export interface PortalRegistryEntry extends PortalRegistryItem {
  icon: LucideIcon;
}

export const PORTAL_GROUP_LABELS: Record<PortalGroup, string> = {
  app: "Application",
  portals: "External Portals",
  internal: "Internal",
};

export const PORTALS: readonly PortalRegistryEntry[] = [
  {
    value: "app",
    label: "Organization",
    icon: LayoutDashboard,
    group: "app",
    shortcut: "⌘1",
    signInPath: "/auth/signin",
    homePath: "/app",
    defaultCallbackUrl: "/app",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "supplier",
    label: "Supplier Portal",
    icon: Package,
    group: "portals",
    shortcut: "⌘2",
    signInPath: "/auth/portal/supplier/signin",
    homePath: "/portal/supplier",
    defaultCallbackUrl: "/portal/supplier",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "customer",
    label: "Customer Portal",
    icon: Users,
    group: "portals",
    shortcut: "⌘3",
    signInPath: "/auth/portal/customer/signin",
    homePath: "/portal/customer",
    defaultCallbackUrl: "/portal/customer",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "investor",
    label: "Investor Portal",
    icon: TrendingUp,
    group: "portals",
    shortcut: "⌘4",
    signInPath: "/auth/portal/investor/signin",
    homePath: "/portal/investor",
    defaultCallbackUrl: "/portal/investor",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "franchisee",
    label: "Franchisee Portal",
    icon: Store,
    group: "portals",
    shortcut: "⌘5",
    signInPath: "/auth/portal/franchisee/signin",
    homePath: "/portal/franchisee",
    defaultCallbackUrl: "/portal/franchisee",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "contractor",
    label: "Contractor Portal",
    icon: HardHat,
    group: "portals",
    shortcut: "⌘6",
    signInPath: "/auth/portal/contractor/signin",
    homePath: "/portal/contractor",
    defaultCallbackUrl: "/portal/contractor",
    visibleInSwitcher: true,
    internal: false,
  },
  {
    value: "cid",
    label: "CID Portal",
    icon: Shield,
    group: "internal",
    shortcut: "⌘7",
    signInPath: "/auth/portal/cid/signin",
    homePath: "/portal/cid",
    defaultCallbackUrl: "/portal/cid",
    visibleInSwitcher: true,
    internal: true,
  },
] as const;

export const PORTAL_MAP = Object.fromEntries(
  PORTALS.map((portal) => [portal.value, portal]),
) as Record<PortalType, PortalRegistryEntry>;

export function getPortal(portal: PortalType): PortalRegistryEntry {
  return PORTAL_MAP[portal];
}

export function getPortalsByGroup(group: PortalGroup): PortalRegistryEntry[] {
  return PORTALS.filter((portal) => portal.group === group);
}

export function isPortalType(value: string): value is PortalType {
  return value in PORTAL_MAP;
}

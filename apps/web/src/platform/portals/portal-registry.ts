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

export type PortalGroup = "app" | "portals" | "internal";

export interface PortalRegistryItem {
  value: PortalType;
  label: string;
  icon: LucideIcon;
  group: PortalGroup;
  shortcut?: string;

  /** Auth route — unified signin uses /auth/signin?tab=portal */
  signInPath: string;

  /** Default landing page after successful auth */
  homePath: string;

  /** Fallback callback when callbackUrl is absent */
  defaultCallbackUrl: string;

  /** Whether visible in portal switcher */
  visibleInSwitcher?: boolean;

  /** Whether portal is considered internal-only */
  internal?: boolean;
}

export const PORTAL_GROUP_LABELS: Record<PortalGroup, string> = {
  app: "Application",
  portals: "External Portals",
  internal: "Internal",
};

export const PORTALS: readonly PortalRegistryItem[] = [
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
    signInPath: "/auth/signin",
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
    signInPath: "/auth/signin",
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
    signInPath: "/auth/signin",
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
    signInPath: "/auth/signin",
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
    signInPath: "/auth/signin",
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
    signInPath: "/auth/signin",
    homePath: "/portal/cid",
    defaultCallbackUrl: "/portal/cid",
    visibleInSwitcher: true,
    internal: true,
  },
] as const;

export const PORTAL_MAP: Record<PortalType, PortalRegistryItem> =
  Object.fromEntries(PORTALS.map((portal) => [portal.value, portal])) as Record<
    PortalType,
    PortalRegistryItem
  >;

export function getPortal(portal: PortalType): PortalRegistryItem {
  return PORTAL_MAP[portal];
}

export function getPortalsByGroup(group: PortalGroup): PortalRegistryItem[] {
  return PORTALS.filter((p) => p.group === group);
}

export function getVisiblePortals(): PortalRegistryItem[] {
  return PORTALS.filter((p) => p.visibleInSwitcher !== false);
}

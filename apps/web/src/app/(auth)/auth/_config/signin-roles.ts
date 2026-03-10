import type { PortalType } from "@afenda/contracts";
import type { LucideIcon } from "lucide-react";
import { Building2, User, Package, Users, TrendingUp } from "lucide-react";

/**
 * ROLES — Single source of truth for portal sign-in variants
 * 
 * To add a new portal (e.g. Franchisee, Member): add one entry here.
 * Nothing else needs to change — the pill selector, form labels, submit
 * button, Google SSO toggle, and footer links all derive from this array.
 * 
 * Field reference:
 *   value       — URL-safe key; also used as React key and RoleValue type member
 *   label       — Display text in the pill selector
 *   icon        — Lucide icon component
 *   portal      — PortalType sent to the credentials provider.
 *                 Map to "app" until a dedicated backend portal ships,
 *                 then update auth.commands.ts and this field together.
 *   emailLabel  — Label on the email <Input>
 *   description — Sub-headline shown below the selector row
 *   submitLabel — Text on the primary submit button
 *   showGoogle  — Whether to render the "Continue with Google" section
 *   footerLinks — Links rendered below the form (forgot password, signup, etc.)
 * 
 * See: docs/adr/0006-auth-portal-role-selector.md
 */

export interface RoleConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  portal: PortalType;
  emailLabel: string;
  description: string;
  submitLabel: string;
  showGoogle: boolean;
  footerLinks: Array<{ href: string; label: string }>;
}

export const ROLES = [
  {
    value: "personal",
    label: "Personal",
    icon: User,
    portal: "app" as PortalType,
    emailLabel: "Email",
    description: "Sign in with your personal AFENDA account",
    submitLabel: "Sign in",
    showGoogle: true,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/signup", label: "Create account" },
    ],
  },
  {
    value: "organization",
    label: "Organization",
    icon: Building2,
    portal: "app" as PortalType,
    emailLabel: "Work email",
    description: "Access your organization workspace",
    submitLabel: "Sign in",
    showGoogle: true,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/signup", label: "Create account" },
    ],
  },
  {
    value: "supplier",
    label: "Supplier",
    icon: Package,
    portal: "supplier" as PortalType,
    emailLabel: "Supplier email",
    description: "Manage invoices and orders in the supplier portal",
    submitLabel: "Sign in to Supplier Portal",
    showGoogle: false,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/portal/accept", label: "Accept invitation" },
    ],
  },
  {
    value: "customer",
    label: "Customer",
    icon: Users,
    portal: "customer" as PortalType,
    emailLabel: "Customer email",
    description: "View orders and statements in the customer portal",
    submitLabel: "Sign in to Customer Portal",
    showGoogle: false,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/portal/accept", label: "Accept invitation" },
    ],
  },
  {
    value: "investor",
    label: "Investor",
    icon: TrendingUp,
    portal: "app" as PortalType, // TODO: change to "investor" once backend portal type is added
    emailLabel: "Investor email",
    description: "Access financial statements and portfolio data",
    submitLabel: "Sign in to Investor Portal",
    showGoogle: false,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/portal/accept", label: "Accept invitation" },
    ],
  },
] as const satisfies readonly RoleConfig[];

/** Union of all valid portal role identifiers — auto-derived from ROLES; never manually maintained. */
export type RoleValue = (typeof ROLES)[number]["value"];

/** Full shape of a single ROLES entry. */
export type Role = (typeof ROLES)[number];

/** O(1) lookup from role value → role config. */
export const ROLE_MAP = Object.fromEntries(
  ROLES.map((r) => [r.value, r])
) as Record<RoleValue, Role>;

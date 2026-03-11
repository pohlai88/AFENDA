import type { PortalType } from "@afenda/contracts";
import { getPortal } from "./portal-registry";

export function getPortalSignInTitle(portal: PortalType): string {
  return `Sign in to ${getPortal(portal).label}`;
}

export function getPortalSignInDescription(portal: PortalType): string {
  return `Continue to the ${getPortal(portal).label.toLowerCase()} with the right workspace context and access controls.`;
}

export function getOrganizationSignInTitle(): string {
  return "Sign in to AFENDA";
}

export function getOrganizationSignInDescription(): string {
  return "Continue to your organization workspace with audit-ready access and role-aware routing.";
}

export function getSignUpTitle(): string {
  return "Create your account";
}

export function getSignUpDescription(): string {
  return "Create your workspace, invite your team, and get operational in minutes.";
}

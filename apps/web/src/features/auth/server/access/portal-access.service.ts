import type { PortalType } from "@afenda/contracts";

export interface PortalAccessContext {
  portal: PortalType;
  roles: string[];
  permissions: string[];
}

export async function canAccessPortal(
  input: PortalAccessContext,
): Promise<boolean> {
  if (input.portal === "app") return true;

  if (input.permissions.includes(`${input.portal}.portal.access`)) {
    return true;
  }

  if (input.roles.includes("admin")) {
    return true;
  }

  return false;
}

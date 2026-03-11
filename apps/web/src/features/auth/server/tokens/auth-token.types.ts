import type { PortalType } from "@afenda/contracts";

export interface InviteTokenViewModel {
  valid: boolean;
  token: string;
  email?: string;
  portal?: PortalType;
  tenantName?: string;
  tenantSlug?: string;
  expiresAt?: string | null;
}

export interface ResetTokenViewModel {
  valid: boolean;
  token: string;
  email?: string;
  expiresAt?: string | null;
}

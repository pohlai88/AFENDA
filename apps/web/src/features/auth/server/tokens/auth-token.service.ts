import { getAfendaAuthService } from "../afenda-auth.service";

/** Result shape for pages — valid + token + optional data. */
export interface VerifyInviteTokenPageResult {
  valid: boolean;
  token: string;
  email?: string;
  portal?: string;
  tenantName?: string;
  tenantSlug?: string;
  expiresAt?: string | null;
}

export interface VerifyResetTokenPageResult {
  valid: boolean;
  token: string;
  email?: string;
  expiresAt?: string | null;
}

export async function verifyInviteToken(token: string): Promise<VerifyInviteTokenPageResult> {
  const service = getAfendaAuthService();
  const result = await service.verifyInviteToken({ token });

  if (!result.ok) {
    return { valid: false, token };
  }

  return {
    valid: true,
    token,
    email: result.data.email,
    portal: result.data.portal,
    tenantName: result.data.tenantName,
    tenantSlug: result.data.tenantSlug,
    expiresAt: result.data.expiresAt ?? null,
  };
}

export async function verifyResetToken(token: string): Promise<VerifyResetTokenPageResult> {
  const service = getAfendaAuthService();
  const result = await service.verifyResetToken({ token });

  if (!result.ok) {
    return { valid: false, token };
  }

  return {
    valid: true,
    token,
    email: result.data.email,
    expiresAt: result.data.expiresAt ?? null,
  };
}

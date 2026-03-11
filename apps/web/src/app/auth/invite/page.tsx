import type { PortalType } from "@afenda/contracts";
import { getPortal } from "../_lib/portal-registry";
import { InviteClientPage } from "./invite-client";
import { verifyInviteToken } from "@/features/auth/server/tokens/auth-token.service";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  buildChallengeExpiry,
  createAuthChallenge,
} from "@/features/auth/server/challenge/auth-challenge.service";

interface InvitePageProps {
  searchParams: Promise<{
    token?: string;
    callbackUrl?: string;
  }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const hasToken = token.length > 0;
  const hasAuthDb = Boolean(process.env.DATABASE_URL);

  const result = hasAuthDb && hasToken
    ? await verifyInviteToken(token)
    : {
        valid: false,
        token,
        email: undefined,
        portal: undefined,
        tenantName: undefined,
        tenantSlug: undefined,
        expiresAt: undefined,
      };

  if (hasAuthDb && result.valid) {
    await createAuthChallenge({
      type: "invite",
      rawToken: result.token,
      email: result.email,
      portal: result.portal as PortalType | undefined,
      callbackUrl: params.callbackUrl,
      expiresAt: result.expiresAt ?? buildChallengeExpiry(30),
      maxAttempts: 5,
      metadata: {
        tenantName: result.tenantName ?? null,
        tenantSlug: result.tenantSlug ?? null,
      },
    });
  }

  if (hasAuthDb && hasToken) {
    await publishAuthAuditEvent(
      result.valid ? "auth.invite.token_verified" : "auth.invite.token_invalid",
      {
        email: result.email,
        portal: result.portal as PortalType | undefined,
        callbackUrl: params.callbackUrl,
        metadata: {
          tokenPresent: Boolean(token),
          expiresAt: result.expiresAt ?? null,
        },
      },
    );
  }

  return (
    <InviteClientPage
      hasToken={hasToken}
      token={result.token}
      callbackUrl={params.callbackUrl}
      inviteEmail={result.email}
      portalLabel={result.portal ? getPortal(result.portal as PortalType).label : undefined}
      tenantName={result.tenantName}
      valid={result.valid}
    />
  );
}

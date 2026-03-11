import { ResetPasswordClientPage } from "./reset-password-client";
import { verifyResetToken } from "@/features/auth/server/tokens/auth-token.service";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  buildChallengeExpiry,
  createAuthChallenge,
} from "@/features/auth/server/challenge/auth-challenge.service";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const hasAuthDb = Boolean(process.env.DATABASE_URL);

  const result = hasAuthDb && token
    ? await verifyResetToken(token)
    : { valid: false, token, email: undefined, expiresAt: undefined };

  if (hasAuthDb && result.valid) {
    await createAuthChallenge({
      type: "reset",
      rawToken: result.token,
      email: result.email,
      expiresAt: result.expiresAt ?? buildChallengeExpiry(30),
      maxAttempts: 5,
    });
  }

  if (hasAuthDb) {
    await publishAuthAuditEvent(
      result.valid ? "auth.reset.token_verified" : "auth.reset.token_invalid",
      {
        email: result.email,
        metadata: {
          tokenPresent: Boolean(token),
          expiresAt: result.expiresAt ?? null,
        },
      },
    );
  }

  return (
    <ResetPasswordClientPage
      token={result.token}
      email={result.email}
      valid={result.valid}
    />
  );
}

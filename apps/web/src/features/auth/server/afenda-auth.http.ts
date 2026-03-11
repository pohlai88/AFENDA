/**
 * HttpAfendaAuthService — adapts external auth backend to AfendaAuthService contract.
 *
 * External API uses different paths and shapes. We map responses to AuthFlowResult.
 */

import type {
  AcceptInviteInput,
  AcceptInviteResult,
  ActionResult,
  AfendaAuthService,
  ResetPasswordInput,
  SignUpInput,
  SignUpResult,
  VerifyCredentialsInput,
  VerifyCredentialsResult,
  VerifyInviteTokenResult,
  VerifyMfaInput,
  VerifyMfaResult,
  VerifyResetTokenResult,
} from "./afenda-auth.types";
import { AuthAdapterError } from "./auth-errors";

const IAM_CREDENTIALS_INVALID = "IAM_CREDENTIALS_INVALID";
const IAM_MFA_INVALID = "IAM_MFA_INVALID";
const IAM_PORTAL_INVITATION_INVALID = "IAM_PORTAL_INVITATION_INVALID";
const IAM_RESET_TOKEN_INVALID = "IAM_RESET_TOKEN_INVALID";

export class HttpAfendaAuthService implements AfendaAuthService {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  private get headers() {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
    };
  }

  async verifyCredentials(input: VerifyCredentialsInput): Promise<VerifyCredentialsResult> {
    const response = await fetch(`${this.baseUrl}/auth/credentials/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });

    if (response.status === 401) {
      return { ok: false, code: IAM_CREDENTIALS_INVALID, message: "Invalid credentials." };
    }

    if (!response.ok) {
      throw new AuthAdapterError("Credential verification failed", { status: response.status });
    }

    const user = (await response.json()) as { id?: string; email?: string };
    return {
      ok: true,
      data: {
        principalId: user.id ?? "",
        email: user.email ?? "",
      },
    };
  }

  async verifyMfaChallenge(input: VerifyMfaInput): Promise<VerifyMfaResult> {
    const response = await fetch(`${this.baseUrl}/auth/mfa/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });

    if (response.status === 401) {
      return { ok: false, code: IAM_MFA_INVALID, message: "Invalid MFA code." };
    }

    if (!response.ok) {
      throw new AuthAdapterError("MFA verification failed", { status: response.status });
    }

    const user = (await response.json()) as { id?: string; email?: string };
    return {
      ok: true,
      data: {
        principalId: user.id ?? "",
        email: user.email ?? "",
      },
    };
  }

  async verifyInviteToken(input: { token: string }): Promise<VerifyInviteTokenResult> {
    const response = await fetch(`${this.baseUrl}/auth/invite/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ token: input.token }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new AuthAdapterError("Invite token verification failed", { status: response.status });
    }

    const body = (await response.json()) as {
      valid?: boolean;
      email?: string;
      portal?: string;
      tenantName?: string;
      tenantSlug?: string;
      expiresAt?: string | null;
    };

    if (!body.valid || !body.email || !body.portal) {
      return {
        ok: false,
        code: IAM_PORTAL_INVITATION_INVALID,
        message: "Invalid or expired invitation.",
      };
    }

    return {
      ok: true,
      data: {
        email: body.email,
        portal: body.portal as Exclude<import("@afenda/contracts").PortalType, "app">,
        tenantName: body.tenantName,
        tenantSlug: body.tenantSlug,
        expiresAt: body.expiresAt ?? undefined,
      },
    };
  }

  async acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    const response = await fetch(`${this.baseUrl}/auth/invite/accept`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        token: input.token,
        name: input.name,
        password: input.password,
      }),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 400) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        code: IAM_PORTAL_INVITATION_INVALID,
        message: err.message ?? "Invitation acceptance failed.",
      };
    }

    if (!response.ok) {
      throw new AuthAdapterError("Invite acceptance failed", { status: response.status });
    }

    const user = (await response.json()) as { email?: string; portal?: string };
    return {
      ok: true,
      data: {
        email: user.email ?? "",
        portal: (user.portal ?? "supplier") as Exclude<import("@afenda/contracts").PortalType, "app">,
      },
    };
  }

  async verifyResetToken(input: { token: string }): Promise<VerifyResetTokenResult> {
    const response = await fetch(`${this.baseUrl}/auth/reset/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ token: input.token }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new AuthAdapterError("Reset token verification failed", { status: response.status });
    }

    const body = (await response.json()) as { valid?: boolean; email?: string; expiresAt?: string | null };

    if (!body.valid || !body.email) {
      return {
        ok: false,
        code: IAM_RESET_TOKEN_INVALID,
        message: "Invalid or expired reset token.",
      };
    }

    return {
      ok: true,
      data: {
        email: body.email,
        expiresAt: body.expiresAt ?? undefined,
      },
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
    const response = await fetch(`${this.baseUrl}/auth/reset/complete`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        token: input.token,
        password: input.password,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        code: IAM_RESET_TOKEN_INVALID,
        message: err.message ?? "Password reset failed.",
      };
    }

    return {
      ok: true,
      data: { message: "Password has been reset successfully." },
    };
  }

  async signUp(_input: SignUpInput): Promise<SignUpResult> {
    throw new AuthAdapterError("Sign-up not supported by HTTP auth backend", { status: 501 });
  }
}

/**
 * ApiAfendaAuthService — real implementation using AFENDA API as source of truth.
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

function resolveServerApiBase(): string {
  const explicitServerBase = process.env.AFENDA_API_URL ?? process.env.API_BASE_URL;
  if (explicitServerBase) return explicitServerBase;

  const publicBase = process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === "production") {
    return publicBase ?? "http://localhost:3001";
  }

  // In local development, prefer localhost unless NEXT_PUBLIC_API_URL already points there.
  if (publicBase && /localhost|127\.0\.0\.1/i.test(publicBase)) {
    return publicBase;
  }

  return "http://localhost:3001";
}

const API_BASE = resolveServerApiBase();

async function authApiFetch(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export class ApiAfendaAuthService implements AfendaAuthService {
  async verifyCredentials(input: VerifyCredentialsInput): Promise<VerifyCredentialsResult> {
    const res = await authApiFetch("/v1/auth/login", {
      email: input.email,
      password: input.password,
      portal: input.portal ?? "app",
    });

    const json = (await res.json()) as
      | {
          ok: true;
          data: { principalId: string; email: string; requiresMfa?: boolean };
          correlationId?: string;
        }
      | { ok: false; code: string; message: string; correlationId?: string };

    return json;
  }

  async verifyResetToken(input: { token: string }): Promise<VerifyResetTokenResult> {
    const res = await authApiFetch("/v1/auth/verify-reset-token", {
      token: input.token,
    });

    const json = (await res.json()) as
      | { ok: true; data: { email: string; expiresAt?: string }; correlationId?: string }
      | { ok: false; code: string; message: string; correlationId?: string };

    return json;
  }

  async resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
    const res = await authApiFetch("/v1/auth/reset-password", {
      idempotencyKey: crypto.randomUUID(),
      token: input.token,
      newPassword: input.password,
    });

    const json = (await res.json()) as
      | { ok: true; data: { message: string }; correlationId?: string }
      | { ok: false; code: string; message: string; correlationId?: string };

    return json;
  }

  async verifyInviteToken(input: { token: string }): Promise<VerifyInviteTokenResult> {
    const res = await authApiFetch("/v1/auth/verify-invite-token", {
      token: input.token,
    });

    const json = (await res.json()) as
      | {
          ok: true;
          data: {
            email: string;
            portal: string;
            tenantName?: string;
            tenantSlug?: string;
            expiresAt?: string;
          };
          correlationId?: string;
        }
      | { ok: false; code: string; message: string; correlationId?: string };

    if (!json.ok) return json;

    return {
      ok: true,
      data: {
        email: json.data.email,
        portal: json.data.portal as Exclude<import("@afenda/contracts").PortalType, "app">,
        tenantName: json.data.tenantName,
        tenantSlug: json.data.tenantSlug,
        expiresAt: json.data.expiresAt,
      },
    };
  }

  async acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    const res = await authApiFetch("/v1/auth/accept-portal-invitation", {
      idempotencyKey: crypto.randomUUID(),
      token: input.token,
      fullName: input.name,
      password: input.password,
    });

    const json = (await res.json()) as
      | {
          ok: true;
          data: { email: string; portal: string; message: string };
          correlationId?: string;
        }
      | { ok: false; code: string; message: string; correlationId?: string };

    if (!json.ok) return json;

    return {
      ok: true,
      data: {
        email: json.data.email,
        portal: json.data.portal as Exclude<import("@afenda/contracts").PortalType, "app">,
      },
    };
  }

  async verifyMfaChallenge(input: VerifyMfaInput): Promise<VerifyMfaResult> {
    const res = await authApiFetch("/v1/auth/verify-mfa-challenge", {
      mfaToken: input.mfaToken,
      code: input.code,
    });

    const json = (await res.json()) as
      | { ok: true; data: { principalId: string; email: string }; correlationId?: string }
      | { ok: false; code: string; message: string; correlationId?: string };

    if (!json.ok) return json;
    return {
      ok: true,
      data: {
        principalId: json.data.principalId,
        email: json.data.email,
      },
    };
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const res = await authApiFetch("/v1/auth/signup", {
      idempotencyKey: crypto.randomUUID(),
      fullName: input.fullName,
      companyName: input.companyName,
      email: input.email,
      password: input.password,
    });

    const json = (await res.json()) as
      | { data: { principalId: string; email: string; orgSlug: string }; correlationId?: string }
      | { error: { code: string; message: string }; correlationId?: string };

    if (!res.ok) {
      const err =
        json && "error" in json
          ? json.error
          : { code: "SIGNUP_FAILED", message: "Unable to create account" };
      return { ok: false, code: err.code, message: err.message };
    }

    const data = json && "data" in json ? json.data : null;
    if (!data) return { ok: false, code: "SIGNUP_FAILED", message: "Unable to create account" };
    return { ok: true, data };
  }
}

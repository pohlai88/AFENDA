/**
 * Auth routes — unauthenticated credential verification for NextAuth.
 *
 * Routes (AuthFlowResult shape where noted):
 *   POST /v1/auth/context
 *   POST /v1/auth/verify-credentials
 *   POST /v1/auth/login (AuthFlowResult)
 *   POST /v1/auth/signup
 *   POST /v1/auth/request-password-reset
 *   POST /v1/auth/verify-reset-token (AuthFlowResult)
 *   POST /v1/auth/reset-password (AuthFlowResult)
 *   POST /v1/auth/request-portal-invitation
 *   POST /v1/auth/verify-invite-token (AuthFlowResult)
 *   POST /v1/auth/accept-portal-invitation (AuthFlowResult)
 *   POST /v1/auth/verify-mfa-challenge (AuthFlowResult, 501 until MFA in core)
 *   POST /v1/auth/verify-session-grant (AuthFlowResult)
 *
 * No Bearer token required. Rate-limited by IP.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  acceptPortalInvitation,
  createSessionGrant,
  getAuthContext,
  mapAuthErrorMessage,
  requestPasswordReset,
  requestPortalInvitation,
  resetPasswordWithToken,
  signUpSelfService,
  verifyCredentials,
  verifyMfaChallenge,
  verifyInviteToken,
  verifyResetToken,
  verifySessionGrant,
} from "@afenda/core";
import {
  AcceptPortalInvitationCommandSchema,
  AuthContextRequestSchema,
  AuthContextResponseSchema,
  IAM_CREDENTIALS_INVALID,
  IAM_EMAIL_ALREADY_REGISTERED,
  IAM_MFA_NOT_IMPLEMENTED,
  LoginCommandSchema,
  LoginDataSchema,
  PortalTypeSchema,
  RequestPasswordResetCommandSchema,
  RequestPortalInvitationCommandSchema,
  ResetPasswordCommandSchema,
  SignUpCommandSchema,
  VerifyInviteTokenCommandSchema,
  VerifyInviteTokenDataSchema,
  VerifyMfaChallengeCommandSchema,
  VerifyResetTokenCommandSchema,
  VerifyResetTokenDataSchema,
  VerifySessionGrantCommandSchema,
  VerifySessionGrantDataSchema,
} from "@afenda/contracts";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../helpers/responses.js";

const VerifyCredentialsBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  portal: PortalTypeSchema.optional(),
});

const VerifyCredentialsSuccessSchema = makeSuccessSchema(
  z.object({
    principalId: z.string().uuid(),
    email: z.string().email(),
  }),
);

const SignUpSuccessSchema = makeSuccessSchema(
  z.object({
    principalId: z.string().uuid(),
    email: z.string().email(),
    orgSlug: z.string().min(1),
  }),
);

const PublicAuthResultSchema = makeSuccessSchema(
  z.object({
    accepted: z.boolean(),
    message: z.string().min(1),
  }),
);

async function dispatchAuthEmail(
  app: FastifyInstance,
  payload: { to: string; subject: string; text: string },
): Promise<void> {
  const webhookUrl = process.env["AUTH_EMAIL_WEBHOOK_URL"];

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return;
    } catch (error) {
      app.log.warn({ err: error }, "Failed to send auth email via webhook, falling back to logger");
    }
  }

  app.log.info(
    {
      to: payload.to,
      subject: payload.subject,
      preview: payload.text,
    },
    "Auth email dispatch (fallback transport)",
  );
}

const AuthContextSuccessSchema = makeSuccessSchema(AuthContextResponseSchema);

/** AuthFlowResult response — 200 for both ok and !ok (client switches on ok). */
const AuthFlowResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([
    z.object({ ok: z.literal(true), data: dataSchema, correlationId: z.string().uuid().optional() }),
    z.object({
      ok: z.literal(false),
      code: z.string().min(1),
      message: z.string().min(1),
      correlationId: z.string().uuid().optional(),
    }),
  ]);

const VerifyResetTokenResponseSchema = AuthFlowResultSchema(VerifyResetTokenDataSchema);
const VerifyInviteTokenResponseSchema = AuthFlowResultSchema(VerifyInviteTokenDataSchema);
const LoginDataWithMfaSchema = LoginDataSchema.extend({
  requiresMfa: z.boolean().optional(),
});
const LoginResponseSchema = AuthFlowResultSchema(LoginDataWithMfaSchema);

export async function authRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/auth/context",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description:
          "Get auth context for progressive UI (SSO discovery, org disambiguation, MFA gating). Never reveals whether email exists.",
        tags: ["Auth"],
        body: AuthContextRequestSchema,
        response: {
          200: AuthContextSuccessSchema,
        },
      },
    },
    async (req) => {
      const body = AuthContextRequestSchema.parse(req.body);
      const context = await getAuthContext(app.db, body.email, body.portal);
      return {
        data: context,
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/verify-credentials",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description:
          "Verify email + password. Used by NextAuth authorize(). Returns principalId and email if valid. Unauthenticated.",
        tags: ["Auth"],
        body: VerifyCredentialsBodySchema,
        response: {
          200: VerifyCredentialsSuccessSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { email, password, portal } = VerifyCredentialsBodySchema.parse(req.body);
      const result = await verifyCredentials(app.db, email, password, portal ?? "app");

      if (!result.ok) {
        return reply.status(401).send({
          error: {
            code: result.error,
            message: mapAuthErrorMessage(result.error),
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: {
          principalId: result.principalId,
          email: result.email,
          requiresMfa: result.requiresMfa ?? false,
        },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/signup",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        description: "Create a self-service organization and admin user account.",
        tags: ["Auth"],
        body: SignUpCommandSchema,
        response: {
          201: SignUpSuccessSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = SignUpCommandSchema.parse(req.body);
      const result = await signUpSelfService(app.db, {
        fullName: body.fullName,
        companyName: body.companyName,
        email: body.email,
        password: body.password,
      });

      if (!result.ok) {
        return reply.status(409).send({
          error: {
            code: result.error,
            message:
              result.error === IAM_EMAIL_ALREADY_REGISTERED
                ? "This email already has an account"
                : "Unable to create account",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: {
          principalId: result.principalId,
          email: result.email,
          orgSlug: result.orgSlug,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/auth/request-password-reset",
    {
      config: {
        rateLimit: { max: 15, timeWindow: "1 minute" },
      },
      schema: {
        description: "Request password reset email with a one-time token.",
        tags: ["Auth"],
        body: RequestPasswordResetCommandSchema,
        response: {
          200: PublicAuthResultSchema,
        },
      },
    },
    async (req) => {
      const body = RequestPasswordResetCommandSchema.parse(req.body);
      const configuredDelivery = (process.env["AUTH_PASSWORD_RESET_DELIVERY"] ?? "link").toLowerCase();
      const resolvedDelivery =
        body.delivery && body.delivery !== "auto"
          ? body.delivery
          : configuredDelivery === "code"
            ? "code"
            : "link";

      const reset = await requestPasswordReset(app.db, {
        email: body.email,
        delivery: resolvedDelivery,
      });

      if (reset.token) {
        if (resolvedDelivery === "code") {
          await dispatchAuthEmail(app, {
            to: reset.email,
            subject: "AFENDA password reset code",
            text: `Use this AFENDA password reset code: ${reset.token}. This code expires in 10 minutes.`,
          });
        } else {
          const defaultResetBase =
            process.env["NEXT_PUBLIC_WEB_URL"] ??
            process.env["NEXT_PUBLIC_APP_URL"] ??
            "http://localhost:3000";
          const baseUrl =
            body.redirectUrl ??
            `${defaultResetBase.replace(/\/$/, "")}/auth/reset-password`;
          const separator = baseUrl.includes("?") ? "&" : "?";
          const resetUrl = `${baseUrl}${separator}token=${encodeURIComponent(reset.token)}`;

          await dispatchAuthEmail(app, {
            to: reset.email,
            subject: "AFENDA password reset",
            text: `Reset your AFENDA password using this link: ${resetUrl}`,
          });
        }
      }

      return {
        data: {
          accepted: true,
          message: "If an account exists, a password reset email has been sent.",
        },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/verify-reset-token",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description: "Verify password reset token without consuming it. API source of truth.",
        tags: ["Auth"],
        body: VerifyResetTokenCommandSchema,
        response: {
          200: VerifyResetTokenResponseSchema,
        },
      },
    },
    async (req) => {
      const body = VerifyResetTokenCommandSchema.parse(req.body);
      const result = await verifyResetToken(app.db, {
        token: body.token,
        email: body.email,
      });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          email: result.email,
          expiresAt: result.expiresAt,
        },
        correlationId: req.correlationId,
      };
    },
  );

  const ResetPasswordDataSchema = z.object({ message: z.string().min(1) });
  const ResetPasswordResponseSchema = AuthFlowResultSchema(ResetPasswordDataSchema);

  typed.post(
    "/auth/reset-password",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        description: "Reset password using a one-time reset token. AuthFlowResult shape.",
        tags: ["Auth"],
        body: ResetPasswordCommandSchema,
        response: {
          200: ResetPasswordResponseSchema,
        },
      },
    },
    async (req) => {
      const body = ResetPasswordCommandSchema.parse(req.body);
      const result = await resetPasswordWithToken(app.db, {
        token: body.token,
        email: body.email,
        newPassword: body.newPassword,
      });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: { message: "Password has been reset successfully." },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/request-portal-invitation",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description: "Send invitation-only supplier/customer portal onboarding link.",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestPortalInvitationCommandSchema,
        response: {
          200: PublicAuthResultSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const body = RequestPortalInvitationCommandSchema.parse(req.body);
      const invitation = await requestPortalInvitation(app.db, {
        orgId,
        invitedByPrincipalId: ctx.principalId,
        email: body.email,
        portal: body.portal,
      });

      const defaultBase =
        process.env["NEXT_PUBLIC_WEB_URL"] ??
        process.env["NEXT_PUBLIC_APP_URL"] ??
        "http://localhost:3000";
      const baseUrl =
        body.redirectUrl ??
        `${defaultBase.replace(/\/$/, "")}/auth/invite`;
      const separator = baseUrl.includes("?") ? "&" : "?";
      const inviteUrl = `${baseUrl}${separator}token=${encodeURIComponent(invitation.token)}&portal=${encodeURIComponent(invitation.portal)}`;

      await dispatchAuthEmail(app, {
        to: body.email,
        subject: `AFENDA ${invitation.portal} portal invitation`,
        text: `You were invited to AFENDA ${invitation.portal} portal. Accept invitation: ${inviteUrl}`,
      });

      return {
        data: {
          accepted: true,
          message: `Invitation sent to ${body.email} for ${invitation.portal} portal`,
        },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/verify-invite-token",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description: "Verify portal invitation token without consuming it. API source of truth.",
        tags: ["Auth"],
        body: VerifyInviteTokenCommandSchema,
        response: {
          200: VerifyInviteTokenResponseSchema,
        },
      },
    },
    async (req) => {
      const body = VerifyInviteTokenCommandSchema.parse(req.body);
      const result = await verifyInviteToken(app.db, { token: body.token });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          email: result.email,
          portal: result.portal,
          tenantName: result.tenantName,
          tenantSlug: result.tenantSlug,
          expiresAt: result.expiresAt,
        },
        correlationId: req.correlationId,
      };
    },
  );

  const AcceptPortalInvitationDataSchema = z.object({
    email: z.string().email(),
    portal: z.enum(["supplier", "customer", "cid", "investor", "franchisee", "contractor"]),
    message: z.string().min(1),
    sessionGrant: z.string().min(32),
  });
  const AcceptPortalInvitationResponseSchema = AuthFlowResultSchema(AcceptPortalInvitationDataSchema);

  typed.post(
    "/auth/accept-portal-invitation",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
      schema: {
        description: "Accept supplier/customer invitation token and activate portal login. AuthFlowResult shape.",
        tags: ["Auth"],
        body: AcceptPortalInvitationCommandSchema,
        response: {
          200: AcceptPortalInvitationResponseSchema,
        },
      },
    },
    async (req) => {
      const body = AcceptPortalInvitationCommandSchema.parse(req.body);
      const result = await acceptPortalInvitation(app.db, {
        token: body.token,
        fullName: body.fullName,
        password: body.password,
      });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      const grantResult = await createSessionGrant(app.db, {
        principalId: result.principalId,
        email: result.email,
        portal: result.portal,
      });

      if (!grantResult.ok) {
        return {
          ok: false as const,
          code: grantResult.error,
          message: mapAuthErrorMessage(grantResult.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          email: result.email,
          portal: result.portal,
          message: "Invitation accepted. You can now sign in to the portal.",
          sessionGrant: grantResult.grant,
        },
        correlationId: req.correlationId,
      };
    },
  );

  const VerifySessionGrantResponseSchema = AuthFlowResultSchema(VerifySessionGrantDataSchema);

  typed.post(
    "/auth/verify-session-grant",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
      schema: {
        description: "Verify one-time session grant from invite/MFA flow. Returns principalId for session creation.",
        tags: ["Auth"],
        body: VerifySessionGrantCommandSchema,
        response: {
          200: VerifySessionGrantResponseSchema,
        },
      },
    },
    async (req) => {
      const body = VerifySessionGrantCommandSchema.parse(req.body);
      const result = await verifySessionGrant(app.db, { grant: body.grant });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          principalId: result.principalId,
          email: result.email,
          portal: result.portal,
        },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/verify-mfa-challenge",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        description: "Verify MFA challenge. Validates TOTP code against challenge, returns session grant.",
        tags: ["Auth"],
        body: VerifyMfaChallengeCommandSchema,
        response: {
          200: z.union([
            z.object({
              ok: z.literal(true),
              data: z.object({
                principalId: z.string().uuid(),
                email: z.string().email(),
                sessionGrant: z.string().min(32),
              }),
              correlationId: z.string().uuid().optional(),
            }),
            z.object({
              ok: z.literal(false),
              code: z.string().min(1),
              message: z.string().min(1),
              correlationId: z.string().uuid().optional(),
            }),
          ]),
        },
      },
    },
    async (req) => {
      const body = VerifyMfaChallengeCommandSchema.parse(req.body);
      const result = await verifyMfaChallenge(app.db, {
        mfaToken: body.mfaToken,
        code: body.code,
      });

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          principalId: result.principalId,
          email: result.email,
          sessionGrant: result.sessionGrant,
        },
        correlationId: req.correlationId,
      };
    },
  );

  typed.post(
    "/auth/login",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        description: "Verify credentials and return principalId/email. AuthFlowResult shape. Alias for verify-credentials.",
        tags: ["Auth"],
        body: LoginCommandSchema,
        response: {
          200: LoginResponseSchema,
        },
      },
    },
    async (req) => {
      const { email, password, portal } = LoginCommandSchema.parse(req.body);
      const result = await verifyCredentials(app.db, email, password, portal ?? "app");

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.error,
          message: mapAuthErrorMessage(result.error),
          correlationId: req.correlationId,
        };
      }

      return {
        ok: true as const,
        data: {
          principalId: result.principalId,
          email: result.email,
          requiresMfa: result.requiresMfa ?? false,
        },
        correlationId: req.correlationId,
      };
    },
  );
}

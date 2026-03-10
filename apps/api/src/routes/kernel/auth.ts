/**
 * Auth routes — unauthenticated credential verification for NextAuth.
 *
 * Routes:
 *   POST /v1/auth/context
 *   POST /v1/auth/verify-credentials
 *   POST /v1/auth/signup
 *   POST /v1/auth/request-password-reset
 *   POST /v1/auth/reset-password
 *   POST /v1/auth/request-portal-invitation
 *   POST /v1/auth/accept-portal-invitation
 *
 * No Bearer token required. Rate-limited by IP.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  acceptPortalInvitation,
  getAuthContext,
  mapAuthErrorMessage,
  requestPasswordReset,
  requestPortalInvitation,
  resetPasswordWithToken,
  signUpSelfService,
  verifyCredentials,
} from "@afenda/core";
import {
  AcceptPortalInvitationCommandSchema,
  AuthContextRequestSchema,
  AuthContextResponseSchema,
  IAM_CREDENTIALS_INVALID,
  IAM_EMAIL_ALREADY_REGISTERED,
  IAM_PORTAL_INVITATION_EXPIRED,
  IAM_PORTAL_INVITATION_INVALID,
  IAM_PORTAL_INVITATION_REQUIRED,
  IAM_RESET_TOKEN_EXPIRED,
  IAM_RESET_TOKEN_INVALID,
  PortalTypeSchema,
  RequestPasswordResetCommandSchema,
  RequestPortalInvitationCommandSchema,
  ResetPasswordCommandSchema,
  SignUpCommandSchema,
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

const AcceptPortalInvitationSuccessSchema = makeSuccessSchema(
  z.object({
    email: z.string().email(),
    portal: z.enum(["supplier", "customer", "cid", "investor", "franchisee", "contractor"]),
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
          const baseUrl = body.redirectUrl ?? process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000/auth/reset-password";
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
    "/auth/reset-password",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        description: "Reset password using a one-time reset token.",
        tags: ["Auth"],
        body: ResetPasswordCommandSchema,
        response: {
          200: PublicAuthResultSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = ResetPasswordCommandSchema.parse(req.body);
      const result = await resetPasswordWithToken(app.db, {
        token: body.token,
        email: body.email,
        newPassword: body.newPassword,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error,
            message: mapAuthErrorMessage(result.error),
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: {
          accepted: true,
          message: "Password has been reset successfully.",
        },
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

      const baseUrl = body.redirectUrl ?? process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000/auth/portal/accept";
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
    "/auth/accept-portal-invitation",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
      schema: {
        description: "Accept supplier/customer invitation token and activate portal login.",
        tags: ["Auth"],
        body: AcceptPortalInvitationCommandSchema,
        response: {
          200: AcceptPortalInvitationSuccessSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = AcceptPortalInvitationCommandSchema.parse(req.body);
      const result = await acceptPortalInvitation(app.db, {
        token: body.token,
        fullName: body.fullName,
        password: body.password,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error,
            message: mapAuthErrorMessage(result.error),
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: {
          email: result.email,
          portal: result.portal,
          message: "Invitation accepted. You can now sign in to the portal.",
        },
        correlationId: req.correlationId,
      };
    },
  );
}

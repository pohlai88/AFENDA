/**
 * IAM routes — identity, context switching, principal info.
 *
 * ADR-0003: Party + Principal model API endpoints.
 *
 * Routes:
 *   GET /v1/me           → current principal info + active context
 *   GET /v1/me/contexts  → list available contexts (hats) for context switching
 *
 * All routes use Zod type provider for automatic request validation and
 * OpenAPI schema generation.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listPrincipalContexts, changePassword } from "@afenda/core";
import {
  IAM_PASSWORD_CHANGE_INVALID,
  IAM_PRINCIPAL_NOT_FOUND,
} from "@afenda/contracts";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth } from "../../helpers/responses.js";

// ── Response schemas ─────────────────────────────────────────────────────────

const MeResponseSchema = makeSuccessSchema(
  z.object({
    principalId: z.string().describe("Authenticated principal UUID"),
    activeContext: z
      .object({
        orgId: z.string().uuid().describe("Active organization UUID"),
        orgSlug: z.string().optional().describe("Active organization slug"),
      })
      .nullable()
      .describe("Current active organization context (null if no context is active)"),
    roles: z.array(z.string()).describe("Role names assigned to this principal"),
    permissions: z.array(z.string()).describe("Flattened permission set"),
  }),
);

const ContextItemSchema = z.object({
  partyRoleId: z.string().uuid().describe("Party role membership ID"),
  orgId: z.string().uuid().describe("Organization UUID"),
  orgName: z.string().describe("Organization display name"),
  roleType: z.string().describe("Role type (e.g. 'admin', 'member')"),
  partyName: z.string().describe("Party display name"),
});

const ContextsResponseSchema = makeSuccessSchema(
  z.object({
    contexts: z.array(ContextItemSchema).describe("Available contexts (hats) for this principal"),
  }),
);

const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function iamRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Current principal info ─────────────────────────────────────────────────
  typed.get(
    "/me",
    {
      schema: {
        description:
          "Returns the current authenticated principal's info and active context. Requires authentication.",
        tags: ["IAM"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: MeResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      return {
        data: {
          principalId: ctx.principalId,
          activeContext: ctx.activeContext ?? null,
          roles: ctx.roles,
          permissions: ctx.permissions,
        },
        correlationId: req.correlationId,
      };
    },
  );

  // ── List available contexts (hats) for context switching ───────────────────
  typed.get(
    "/me/contexts",
    {
      schema: {
        description:
          "Returns all contexts (partyRole memberships) available to the authenticated principal. Used by the UI for context switching dropdown. Each context represents a 'hat' — a party role in an organization (ADR-0003).",
        tags: ["IAM"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: ContextsResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const contexts = await listPrincipalContexts(app.db, ctx.principalId);

      const contextItems = contexts.map((ctx) => ({
        partyRoleId: ctx.partyRoleId,
        orgId: ctx.orgId,
        orgName: ctx.orgName,
        roleType: ctx.roleType,
        partyName: ctx.orgName, // TODO: resolve party name separately
      }));

      return {
        data: { contexts: contextItems },
        correlationId: req.correlationId,
      };
    },
  );

  // ── Change password ─────────────────────────────────────────────────────────
  typed.patch(
    "/me/password",
    {
      schema: {
        description: "Change the authenticated principal's password. Requires current password.",
        tags: ["IAM"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ChangePasswordBodySchema,
        response: {
          200: makeSuccessSchema(z.object({})),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const { currentPassword, newPassword } = ChangePasswordBodySchema.parse(req.body);
      const result = await changePassword(app.db, ctx.principalId, currentPassword, newPassword);

      if (!result.ok) {
        const status =
          result.error === IAM_PRINCIPAL_NOT_FOUND ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error,
            message:
              result.error === IAM_PASSWORD_CHANGE_INVALID
                ? "Current password is incorrect"
                : "Principal not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: {},
        correlationId: req.correlationId,
      };
    },
  );
}

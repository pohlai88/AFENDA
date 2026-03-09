/**
 * Organization routes — org profile management and member visibility.
 *
 * Routes:
 *   GET  /v1/organization              → current org profile (name, currency, slug)
 *   PATCH /v1/organization             → update name and/or functional_currency
 *   GET  /v1/organization/members      → read-only member list for Access page
 *
 * RULES:
 *   1. organization.slug is immutable — never exposed as a writable field.
 *   2. PATCH requires admin.settings.write.
 *   3. GET routes require admin.settings.read.
 *   4. Writes an audit log row on PATCH.
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  UpdateOrganizationCommandSchema,
  OrgProfileResponseSchema,
  OrgMembersResponseSchema,
  type OrgId,
  type PrincipalId,
  type CorrelationId,
} from "@afenda/contracts";
import { getOrgProfile, updateOrgProfile, listOrgMembers, writeAuditLog } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireOrg, requireAuth } from "../../helpers/responses.js";

const OrgProfileGetResponseSchema = makeSuccessSchema(OrgProfileResponseSchema);
const OrgMembersGetResponseSchema = makeSuccessSchema(OrgMembersResponseSchema);
const OrgPatchResponseSchema = makeSuccessSchema(OrgProfileResponseSchema);

export async function organizationRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /v1/organization ─────────────────────────────────────────────────
  typed.get(
    "/organization",
    {
      schema: {
        description: "Get the current org profile: display name, base currency, and slug.",
        tags: ["Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: OrgProfileGetResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.read permission" },
          correlationId: req.correlationId,
        });
      }

      const org = await getOrgProfile(app.db, orgId as OrgId);
      if (!org) {
        return reply.status(404).send({
          error: { code: "IAM_ORG_NOT_FOUND", message: "Organization not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: org, correlationId: req.correlationId };
    },
  );

  // ── PATCH /v1/organization ────────────────────────────────────────────────
  typed.patch(
    "/organization",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Update org display name and/or base currency. Slug is immutable.",
        tags: ["Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateOrganizationCommandSchema,
        response: {
          200: OrgPatchResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.write permission" },
          correlationId: req.correlationId,
        });
      }

      const { name, functionalCurrency } = req.body;
      if (!name && !functionalCurrency) {
        return reply.status(400).send({
          error: {
            code: "SHARED_VALIDATION_ERROR",
            message: "At least one of name or functionalCurrency must be provided",
          },
          correlationId: req.correlationId,
        });
      }

      const ctx = { activeContext: { orgId: orgId as OrgId } };

      await updateOrgProfile(app.db, orgId as OrgId, { name, functionalCurrency });

      await writeAuditLog(app.db, ctx, {
        actorPrincipalId: auth.principalId as PrincipalId,
        action: "settings.updated",
        entityType: "organization",
        entityId: undefined,
        correlationId: req.correlationId as CorrelationId,
        details: {
          changedKeys: ([name ? "name" : null, functionalCurrency ? "functionalCurrency" : null].filter((v): v is string => v !== null)),
          categories: ["company"],
        },
      });

      const org = await getOrgProfile(app.db, orgId as OrgId);
      if (!org) {
        return reply.status(404).send({
          error: { code: "IAM_ORG_NOT_FOUND", message: "Organization not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: org, correlationId: req.correlationId };
    },
  );

  // ── GET /v1/organization/members ─────────────────────────────────────────
  typed.get(
    "/organization/members",
    {
      schema: {
        description:
          "List org members with their roles and join dates. Read-only — used by the Access settings page.",
        tags: ["Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: OrgMembersGetResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.read permission" },
          correlationId: req.correlationId,
        });
      }

      const members = await listOrgMembers(app.db, orgId as OrgId);

      return { data: { members }, correlationId: req.correlationId };
    },
  );
}

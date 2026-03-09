/**
 * Custom fields definition routes — kernel-governed metadata API.
 *
 * This file owns the DEFINITION API only:
 *   GET    /v1/custom-fields?entityType=supplier
 *   POST   /v1/custom-fields
 *   PATCH  /v1/custom-fields/:id
 *   DELETE /v1/custom-fields/:id
 *
 * The VALUE API (PATCH /v1/suppliers/:id/custom-fields etc.) lives in each
 * entity's own route file (erp/supplier.ts, erp/finance/ap.ts, etc.).
 * That boundary is intentional: kernel defines the metadata, domain owns values.
 *
 * Permission:
 *   admin.custom-fields.read  — GET
 *   admin.custom-fields.write — POST, PATCH, DELETE
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ApiErrorResponseSchema, makeSuccessSchema, requireOrg, requireAuth } from "../../helpers/responses.js";
import {
  CustomFieldEntityTypeValues,
  CustomFieldsQueryParamsSchema,
  CustomFieldDefResponseSchema,
  CreateCustomFieldDefCommandSchema,
  UpdateCustomFieldDefCommandSchema,
  type OrgId,
  type PrincipalId,
  type CorrelationId,
} from "@afenda/contracts";
import {
  getCustomFieldDefs,
  getCustomFieldDefById,
  createCustomFieldDef,
  updateCustomFieldDef,
  deleteCustomFieldDef,
  CustomFieldError,
} from "@afenda/core";

// ── Response schemas ──────────────────────────────────────────────────────────

const DefListResponseSchema = makeSuccessSchema(z.array(CustomFieldDefResponseSchema));
const DefResponseSchema = makeSuccessSchema(CustomFieldDefResponseSchema);
const DeletedResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid(), deleted: z.boolean(), deactivated: z.boolean() }));

// ── Error → HTTP mapping ──────────────────────────────────────────────────────

function cfErrorStatus(code: string): 400 | 403 | 404 | 409 {
  if (code === "SHARED_FORBIDDEN") return 403;
  if (code === "CFG_CUSTOM_FIELD_NOT_FOUND") return 404;
  if (code === "CFG_CUSTOM_FIELD_KEY_IMMUTABLE") return 409;
  return 400;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export async function customFieldRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /v1/custom-fields ─────────────────────────────────────────────────
  typed.get(
    "/custom-fields",
    {
      schema: {
        description:
          "List custom field definitions for the org. " +
          "Optionally filter by entityType. Active fields only by default.",
        tags: ["Custom Fields"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CustomFieldsQueryParamsSchema,
        response: {
          200: DefListResponseSchema,
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

      if (!auth.permissionsSet.has("admin.custom-fields.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.custom-fields.read permission" },
          correlationId: req.correlationId,
        });
      }

      const defs = await getCustomFieldDefs(app.db, orgId, {
        entityType: req.query.entityType,
        includeInactive: req.query.includeInactive,
      });

      return { data: defs, correlationId: req.correlationId };
    },
  );

  // ── POST /v1/custom-fields ────────────────────────────────────────────────
  typed.post(
    "/custom-fields",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        description: "Create a new custom field definition for the org.",
        tags: ["Custom Fields"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateCustomFieldDefCommandSchema,
        response: {
          201: DefResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.custom-fields.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.custom-fields.write permission" },
          correlationId: req.correlationId,
        });
      }

      try {
        const def = await createCustomFieldDef(
          app.db,
          orgId as OrgId,
          req.body,
          auth.principalId as PrincipalId,
          req.correlationId as CorrelationId,
        );
        return reply.status(201).send({ data: def, correlationId: req.correlationId });
      } catch (err) {
        if (err instanceof CustomFieldError) {
          const status: 400 | 403 | 409 =
            err.code === "SHARED_FORBIDDEN" ? 403
            : err.code === "CFG_CUSTOM_FIELD_KEY_IMMUTABLE" ? 409
            : 400;
          return reply.status(status).send({
            error: {
              code: err.code,
              message: err.message,
              ...(err.fieldPath ? { fieldPath: err.fieldPath } : {}),
            },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }
    },
  );

  // ── PATCH /v1/custom-fields/:id ───────────────────────────────────────────
  typed.patch(
    "/custom-fields/:id",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        description:
          "Update a custom field definition. " +
          "api_key and entity_type are immutable — include them in the body to get 409.",
        tags: ["Custom Fields"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateCustomFieldDefCommandSchema,
        response: {
          200: DefResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.custom-fields.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.custom-fields.write permission" },
          correlationId: req.correlationId,
        });
      }

      try {
        const def = await updateCustomFieldDef(
          app.db,
          orgId as OrgId,
          req.params.id,
          req.body,
          auth.principalId as PrincipalId,
          req.correlationId as CorrelationId,
        );
        return { data: def, correlationId: req.correlationId };
      } catch (err) {
        if (err instanceof CustomFieldError) {
          const status = cfErrorStatus(err.code);
          return reply.status(status).send({
            error: {
              code: err.code,
              message: err.message,
              ...(err.fieldPath ? { fieldPath: err.fieldPath } : {}),
            },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }
    },
  );

  // ── DELETE /v1/custom-fields/:id ──────────────────────────────────────────
  typed.delete(
    "/custom-fields/:id",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Delete or deactivate a custom field definition. " +
          "If values exist, the field is soft-deactivated (active=false). " +
          "If no values exist, the row is hard-deleted.",
        tags: ["Custom Fields"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: DeletedResponseSchema,
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

      if (!auth.permissionsSet.has("admin.custom-fields.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.custom-fields.write permission" },
          correlationId: req.correlationId,
        });
      }

      try {
        // Check existence first to determine if it was deactivated or deleted
        // (deleteCustomFieldDef handles the distinction internally)
        await deleteCustomFieldDef(
          app.db,
          orgId as OrgId,
          req.params.id,
          auth.principalId as PrincipalId,
          req.correlationId as CorrelationId,
        );

        // Determine if it was deactivated (still exists) or hard-deleted
        const remaining = await getCustomFieldDefById(app.db, orgId, req.params.id);

        return {
          data: {
            id: req.params.id,
            deleted: !remaining,
            deactivated: !!remaining,
          },
          correlationId: req.correlationId,
        };
      } catch (err) {
        if (err instanceof CustomFieldError) {
          const status: 403 | 404 =
            err.code === "CFG_CUSTOM_FIELD_NOT_FOUND" ? 404 : 403;
          return reply.status(status).send({
            error: { code: err.code, message: err.message },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }
    },
  );

  // ── Entity type vocabulary ─────────────────────────────────────────────────
  typed.get(
    "/custom-fields/entity-types",
    {
      schema: {
        description: "List the supported entity types for custom fields.",
        tags: ["Custom Fields"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.array(z.enum(CustomFieldEntityTypeValues))),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req, reply);
      if (!auth) return;
      return { data: [...CustomFieldEntityTypeValues], correlationId: req.correlationId };
    },
  );
}

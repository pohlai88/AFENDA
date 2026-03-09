/**
 * Supplier routes — list suppliers with cursor pagination.
 *
 * Also owns the VALUE API for supplier custom fields:
 *   PATCH /v1/suppliers/:id/custom-fields
 *
 * The definition API lives in routes/kernel/custom-fields.ts (kernel-governed).
 * This file is entity-domain-governed for values — it validates and writes
 * custom field values for supplier entity instances.
 *
 * TODO(Sprint 3): Implement full CRUD when supplier domain service is added to core.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../helpers/responses.js";
import {
  CursorParamsSchema,
  SupplierStatusSchema,
  UpsertCustomFieldValuesCommandSchema,
  CustomFieldValuesResponseSchema,
  type OrgId,
  type PrincipalId,
  type CorrelationId,
} from "@afenda/contracts";
import { upsertCustomFieldValues, getCustomFieldValues, CustomFieldError } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const SupplierRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  taxId: z.string().nullable(),
  contactEmail: z.string().nullable(),
  status: SupplierStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SupplierListSchema = makeSuccessSchema(z.array(SupplierRowSchema));

// ── Plugin ───────────────────────────────────────────────────────────────────

export async function supplierRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── List suppliers ─────────────────────────────────────────────────────────
  typed.get(
    "/suppliers",
    {
      schema: {
        description: "List suppliers with cursor pagination.",
        tags: ["Supplier"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema,
        response: {
          200: SupplierListSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      // TODO(Sprint 3): Delegate to core/supplier service.
      return {
        data: [],
        cursor: null,
        hasMore: false,
        correlationId: req.correlationId,
      };
    },
  );

  // ── PATCH /v1/suppliers/:id/custom-fields ─────────────────────────────────
  // Value API — entity-domain-governed.
  // Upsert custom field values for a specific supplier instance.
  // null value = clear the stored value (falls back to definition default in UI).
  typed.patch(
    "/suppliers/:id/custom-fields",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        description:
          "Upsert custom field values for a supplier. " +
          "null value clears the stored value. " +
          "api_key must match an active custom field definition for entity_type=supplier.",
        tags: ["Supplier"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: UpsertCustomFieldValuesCommandSchema,
        response: {
          200: makeSuccessSchema(CustomFieldValuesResponseSchema),
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

      if (!auth.permissionsSet.has("sup.supplier.create")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires sup.supplier.create permission" },
          correlationId: req.correlationId,
        });
      }

      try {
        const result = await upsertCustomFieldValues(
          app.db,
          orgId as OrgId,
          "supplier",
          req.params.id,
          req.body,
          auth.principalId as PrincipalId,
          req.correlationId as CorrelationId,
        );
        return { data: result, correlationId: req.correlationId };
      } catch (err) {
        if (err instanceof CustomFieldError) {
          const status =
            err.code === "CFG_CUSTOM_FIELD_NOT_FOUND" ? 404
            : err.code === "SHARED_FORBIDDEN" ? 403
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

  // ── GET /v1/suppliers/:id/custom-fields ───────────────────────────────────
  // Returns current custom field values for a supplier.
  typed.get(
    "/suppliers/:id/custom-fields",
    {
      schema: {
        description: "Get custom field values for a supplier (keyed by api_key).",
        tags: ["Supplier"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(CustomFieldValuesResponseSchema),
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

      if (!auth.permissionsSet.has("sup.supplier.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires sup.supplier.read permission" },
          correlationId: req.correlationId,
        });
      }

      const values = await getCustomFieldValues(app.db, orgId, "supplier", req.params.id);
      return { data: values, correlationId: req.correlationId };
    },
  );
}

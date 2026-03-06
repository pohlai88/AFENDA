/**
 * Supplier routes — list suppliers with cursor pagination.
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
} from "../helpers/responses.js";
import {
  CursorParamsSchema,
  SupplierStatusSchema,
  type OrgId,
} from "@afenda/contracts";

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
}

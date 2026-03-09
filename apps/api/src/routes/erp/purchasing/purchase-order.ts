/**
 * Purchase Order routes — create, list, get-by-id.
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../helpers/responses.js";
import {
  CreatePurchaseOrderCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PurchaseOrderId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrderById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const CreatePurchaseOrderResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    poNumber: z.string(),
  }),
);

const PurchaseOrderDetailSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    supplierId: z.string().uuid(),
    poNumber: z.string(),
    amountMinor: z.string().describe("Bigint as string"),
    currencyCode: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const PurchaseOrderListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      supplierId: z.string().uuid(),
      poNumber: z.string(),
      amountMinor: z.string(),
      currencyCode: z.string(),
      status: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): PolicyContext {
  return {
    principalId: req.ctx?.principalId,
    permissionsSet: req.ctx?.permissionsSet ?? new Set(),
  };
}

function serialisePurchaseOrder(row: {
  id: string;
  orgId: string;
  supplierId: string;
  poNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    poNumber: row.poNumber,
    amountMinor: row.amountMinor.toString(),
    currencyCode: row.currencyCode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Route registration ───────────────────────────────────────────────────────

export async function purchaseOrderRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create ─────────────────────────────────────────────────────────────────
  typed.post(
    "/commands/create-purchase-order",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a draft purchase order",
        tags: ["Purchase Orders"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePurchaseOrderCommandSchema,
        response: {
          201: CreatePurchaseOrderResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      handler: async (req, reply) => {
        const orgId = requireOrg(req, reply);
        if (!orgId) return;
        const ctx = requireAuth(req, reply);
        if (!ctx) return;

        const result = await createPurchaseOrder(
          app.db,
          buildCtx(orgId),
          buildPolicyCtx(req),
          req.correlationId as CorrelationId,
          {
            supplierId: req.body.supplierId,
            amountMinor: req.body.amountMinor,
            currencyCode: req.body.currencyCode,
            idempotencyKey: req.body.idempotencyKey,
          },
        );

        if (!result.ok) {
          const status = result.error.code === "SUP_SUPPLIER_NOT_FOUND" ? 404 : 422;
          return reply.status(status).send({
            error: {
              code: result.error.code,
              message: result.error.message,
              details: result.error.meta,
            },
            correlationId: req.correlationId,
          });
        }

        return reply.status(201).send({
          data: result.data,
          correlationId: req.correlationId,
        });
      },
    },
  );

  // ── List ──────────────────────────────────────────────────────────────────
  typed.get(
    "/purchase-orders",
    {
      schema: {
        description: "List purchase orders (cursor-paginated)",
        tags: ["Purchase Orders"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.enum(["draft", "approved", "sent", "cancelled"]).optional(),
        }),
        response: {
          200: PurchaseOrderListSchema,
          401: ApiErrorResponseSchema,
        },
      },
      handler: async (req, reply) => {
        const orgId = requireOrg(req, reply);
        if (!orgId) return;
        const ctx = requireAuth(req, reply);
        if (!ctx) return;

        const { cursor, limit, status } = req.query;
        const page = await listPurchaseOrders(app.db, orgId as OrgId, {
          cursor,
          limit,
          status,
        });

        return reply.send({
          ...page,
          data: page.data.map(serialisePurchaseOrder),
          correlationId: req.correlationId,
        });
      },
    },
  );

  // ── Get by ID ──────────────────────────────────────────────────────────────
  typed.get(
    "/purchase-orders/:id",
    {
      schema: {
        description: "Get a purchase order by ID",
        tags: ["Purchase Orders"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: PurchaseOrderDetailSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      handler: async (req, reply) => {
        const orgId = requireOrg(req, reply);
        if (!orgId) return;
        const ctx = requireAuth(req, reply);
        if (!ctx) return;

        const po = await getPurchaseOrderById(
          app.db,
          orgId as OrgId,
          req.params.id as PurchaseOrderId,
        );

        if (!po) {
          return reply.status(404).send({
            error: {
              code: "PURCH_PURCHASE_ORDER_NOT_FOUND",
              message: "Purchase order not found",
            },
            correlationId: req.correlationId,
          });
        }

        return reply.send({
          data: serialisePurchaseOrder(po),
          correlationId: req.correlationId,
        });
      },
    },
  );
}

/**
 * Receipt (GRN) routes â€” create, list, get-by-id.
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
import { serializeDate } from "../../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../helpers/context.js";
import {
  CreateReceiptCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type ReceiptId,
  type PrincipalId,
} from "@afenda/contracts";
import { createReceipt, listReceipts, getReceiptById } from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

const CreateReceiptResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid(), receiptNumber: z.string() }),
);

const ReceiptDetailSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    receiptNumber: z.string(),
    amountMinor: z.string(),
    currencyCode: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const ReceiptListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      purchaseOrderId: z.string().uuid(),
      receiptNumber: z.string(),
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

function serialiseReceipt(row: {
  id: string;
  orgId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    purchaseOrderId: row.purchaseOrderId,
    receiptNumber: row.receiptNumber,
    amountMinor: row.amountMinor.toString(),
    currencyCode: row.currencyCode,
    status: row.status,
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

export async function receiptRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post("/commands/create-receipt", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    schema: {
      description: "Create a draft receipt (GRN) against a purchase order",
      tags: ["Receipts"],
      security: [{ bearerAuth: [] }, { devAuth: [] }],
      body: CreateReceiptCommandSchema,
      response: {
        201: CreateReceiptResponseSchema,
        400: ApiErrorResponseSchema,
        401: ApiErrorResponseSchema,
        404: ApiErrorResponseSchema,
        422: ApiErrorResponseSchema,
      },
    },
    handler: async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const result = await createReceipt(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          purchaseOrderId: req.body.purchaseOrderId,
          amountMinor: req.body.amountMinor,
          currencyCode: req.body.currencyCode,
          idempotencyKey: req.body.idempotencyKey,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "PURCH_RECEIPT_PO_NOT_FOUND" ? 404 : 422;
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
  });

  typed.get("/receipts", {
    schema: {
      description: "List receipts (cursor-paginated)",
      tags: ["Receipts"],
      security: [{ bearerAuth: [] }, { devAuth: [] }],
      querystring: CursorParamsSchema.extend({
        status: z.enum(["draft", "received", "cancelled"]).optional(),
        purchaseOrderId: z.string().uuid().optional(),
      }),
      response: { 200: ReceiptListSchema, 401: ApiErrorResponseSchema },
    },
    handler: async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const { cursor, limit, status, purchaseOrderId } = req.query;
      const page = await listReceipts(app.db, orgId as OrgId, {
        cursor,
        limit,
        status,
        purchaseOrderId,
      });

      return reply.send({
        ...page,
        data: page.data.map(serialiseReceipt),
        correlationId: req.correlationId,
      });
    },
  });

  typed.get("/receipts/:id", {
    schema: {
      description: "Get a receipt by ID",
      tags: ["Receipts"],
      security: [{ bearerAuth: [] }, { devAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: ReceiptDetailSchema,
        401: ApiErrorResponseSchema,
        404: ApiErrorResponseSchema,
      },
    },
    handler: async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const r = await getReceiptById(app.db, orgId as OrgId, req.params.id as ReceiptId);

      if (!r) {
        return reply.status(404).send({
          error: {
            code: "PURCH_RECEIPT_NOT_FOUND",
            message: "Receipt not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.send({
        data: serialiseReceipt(r),
        correlationId: req.correlationId,
      });
    },
  });
}

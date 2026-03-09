/**
 * Payment Run Item routes — add item, list items, get by ID.
 *
 * RULES:
 *   1. Use ZodTypeProvider for schema → schema.body, schema.response.
 *   2. Commands: rate-limit 30/min, require auth, require org.
 *   3. Never import @afenda/db — use @afenda/core services.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../../helpers/responses.js";
import {
  AddPaymentRunItemCommandSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  addPaymentRunItem,
  listPaymentRunItems,
  getPaymentRunItemById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const PaymentRunItemRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  paymentRunId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  supplierId: z.string().uuid(),
  invoiceNumber: z.string(),
  invoiceDueDate: z.string(),
  invoiceAmountMinor: z.string(),
  amountPaidMinor: z.string(),
  discountTakenMinor: z.string(),
  status: z.string(),
  paymentReference: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): PolicyContext {
  return {
    principalId: req.ctx?.principalId,
    permissionsSet: req.ctx?.permissionsSet ?? new Set(),
  };
}

function serialiseItem(row: {
  id: string;
  orgId: string;
  paymentRunId: string;
  invoiceId: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDueDate: string;
  invoiceAmountMinor: bigint;
  amountPaidMinor: bigint;
  discountTakenMinor: bigint;
  status: string;
  paymentReference: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    paymentRunId: row.paymentRunId,
    invoiceId: row.invoiceId,
    supplierId: row.supplierId,
    invoiceNumber: row.invoiceNumber,
    invoiceDueDate: row.invoiceDueDate,
    invoiceAmountMinor: String(row.invoiceAmountMinor),
    amountPaidMinor: String(row.amountPaidMinor),
    discountTakenMinor: String(row.discountTakenMinor),
    status: row.status,
    paymentReference: row.paymentReference,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_PAYMENT_RUN_NOT_FOUND":
    case "AP_INVOICE_NOT_FOUND":
    case "AP_PAYMENT_RUN_ITEM_NOT_FOUND":
      return 404 as const;
    case "AP_PAYMENT_RUN_ITEM_DUPLICATE_INVOICE":
    case "AP_INVOICE_ALREADY_PAID":
      return 409 as const;
    case "AP_PAYMENT_RUN_NOT_DRAFT":
    case "AP_PAYMENT_RUN_ITEM_INVOICE_NOT_PAYABLE":
    case "AP_PAYMENT_RUN_CURRENCY_MISMATCH":
    case "AP_PAYMENT_RUN_ITEM_AMOUNT_EXCEEDS_BALANCE":
      return 422 as const;
    default:
      return 400 as const;
  }
}

// ── Route registration ───────────────────────────────────────────────────────

export async function paymentRunItemRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Add item to payment run ───────────────────────────────────────────────
  typed.post(
    "/commands/add-payment-run-item",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Add an invoice to a payment run.",
        tags: ["Payment Run Item"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddPaymentRunItemCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };

      const result = await addPaymentRunItem(
        app.db,
        ctx,
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          paymentRunId: req.body.paymentRunId,
          invoiceId: req.body.invoiceId,
          amountPaidMinor: req.body.amountPaidMinor,
          takeDiscount: req.body.takeDiscount,
        },
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
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
  );

  // ── List items in a payment run ─────────────────────────────────────────────
  typed.get(
    "/payment-runs/:paymentRunId/items",
    {
      schema: {
        description: "List items in a payment run.",
        tags: ["Payment Run Item"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ paymentRunId: z.string().uuid() }),
        response: {
          200: z.object({
            data: z.array(PaymentRunItemRowSchema),
            correlationId: z.string().uuid(),
          }),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const items = await listPaymentRunItems(
        app.db,
        orgId as OrgId,
        req.params.paymentRunId,
      );

      return {
        data: items.map(serialiseItem),
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get payment run item by ID ─────────────────────────────────────────────
  typed.get(
    "/payment-run-items/:id",
    {
      schema: {
        description: "Get payment run item by ID.",
        tags: ["Payment Run Item"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PaymentRunItemRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const item = await getPaymentRunItemById(app.db, orgId as OrgId, req.params.id);

      if (!item) {
        return reply.status(404).send({
          error: {
            code: "AP_PAYMENT_RUN_ITEM_NOT_FOUND",
            message: "Payment run item not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseItem(item),
        correlationId: req.correlationId,
      };
    },
  );
}

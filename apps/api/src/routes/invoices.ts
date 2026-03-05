/**
 * Invoice routes — submission, approval, rejection, void, list, get-by-id.
 *
 * Follows the Sprint 0 evidence.ts pattern:
 *   - ZodTypeProvider for automatic validation + OpenAPI generation
 *   - makeSuccessSchema / ApiErrorResponseSchema for response shapes
 *   - requireOrg / requireAuth guards
 *   - Domain services from @afenda/core (never direct @afenda/db access)
 *   - Rate limiting via config.rateLimit overrides
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ApiErrorResponseSchema, makeSuccessSchema, requireOrg, requireAuth } from "../helpers/responses.js";
import {
  SubmitInvoiceCommandSchema,
  ApproveInvoiceCommandSchema,
  RejectInvoiceCommandSchema,
  VoidInvoiceCommandSchema,
  MarkPaidCommandSchema,
  InvoiceSchema,
  InvoiceStatusSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type InvoiceId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  submitInvoice,
  approveInvoice,
  rejectInvoice,
  voidInvoice,
  markPaid,
  listInvoices,
  getInvoiceById,
  getInvoiceHistory,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const InvoiceResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    invoiceNumber: z.string(),
  }),
);

const InvoiceDetailSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    supplierId: z.string().uuid(),
    invoiceNumber: z.string(),
    amountMinor: z.string().describe("Bigint as string"),
    currencyCode: z.string(),
    status: z.string(),
    dueDate: z.string().nullable(),
    submittedByPrincipalId: z.string().uuid().nullable(),
    submittedAt: z.string().datetime().nullable(),
    poReference: z.string().nullable(),
    paidAt: z.string().datetime().nullable(),
    paidByPrincipalId: z.string().uuid().nullable(),
    paymentReference: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const InvoiceListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      supplierId: z.string().uuid(),
      invoiceNumber: z.string(),
      amountMinor: z.string().describe("Bigint as string"),
      currencyCode: z.string(),
      status: z.string(),
      dueDate: z.string().nullable(),
      submittedByPrincipalId: z.string().uuid().nullable(),
      submittedAt: z.string().datetime().nullable(),
      poReference: z.string().nullable(),
      paidAt: z.string().datetime().nullable(),
      paidByPrincipalId: z.string().uuid().nullable(),
      paymentReference: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

const InvoiceHistorySchema = makeSuccessSchema(
  z.array(
    z.object({
      id: z.string().uuid(),
      fromStatus: z.string().nullable(),
      toStatus: z.string(),
      actorPrincipalId: z.string().uuid().nullable(),
      correlationId: z.string(),
      reason: z.string().nullable(),
      occurredAt: z.string().datetime(),
    }),
  ),
);

const ActionResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid() }),
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: { ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> } }): PolicyContext {
  return {
    principalId: req.ctx?.principalId,
    permissionsSet: req.ctx?.permissionsSet ?? new Set(),
  };
}

/**
 * Serialise an invoice row for JSON transport.
 * Converts BigInt to string, Date to ISO string.
 */
function serialiseInvoice(row: {
  id: string;
  orgId: string;
  supplierId: string;
  invoiceNumber: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  dueDate: string | null;
  submittedByPrincipalId: string | null;
  submittedAt: Date | null;
  poReference: string | null;
  paidAt: Date | null;
  paidByPrincipalId: string | null;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    invoiceNumber: row.invoiceNumber,
    amountMinor: row.amountMinor.toString(),
    currencyCode: row.currencyCode,
    status: row.status,
    dueDate: row.dueDate,
    submittedByPrincipalId: row.submittedByPrincipalId,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    poReference: row.poReference,
    paidAt: row.paidAt?.toISOString() ?? null,
    paidByPrincipalId: row.paidByPrincipalId,
    paymentReference: row.paymentReference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Route registration ───────────────────────────────────────────────────────

export async function invoiceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Submit invoice ─────────────────────────────────────────────────────────
  typed.post(
    "/commands/submit-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Submit a new invoice for approval.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubmitInvoiceCommandSchema,
        response: {
          201: InvoiceResponseSchema,
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

      const result = await submitInvoice(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          supplierId: req.body.supplierId,
          amountMinor: req.body.amountMinor,
          currencyCode: req.body.currencyCode,
          dueDate: req.body.dueDate,
          poReference: req.body.poReference,
          idempotencyKey: req.body.idempotencyKey,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "SUP_SUPPLIER_NOT_FOUND" ? 400 : 400;
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
  );

  // ── Approve invoice ────────────────────────────────────────────────────────
  typed.post(
    "/commands/approve-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Approve a submitted invoice. SoD: submitter ≠ approver.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApproveInvoiceCommandSchema,
        response: {
          200: ActionResponseSchema,
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

      const result = await approveInvoice(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body.invoiceId,
        req.body.reason,
      );

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // ── Reject invoice ─────────────────────────────────────────────────────────
  typed.post(
    "/commands/reject-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Reject a submitted invoice. Reason is mandatory.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RejectInvoiceCommandSchema,
        response: {
          200: ActionResponseSchema,
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

      const result = await rejectInvoice(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body.invoiceId,
        req.body.reason,
      );

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // ── Void invoice ───────────────────────────────────────────────────────────
  typed.post(
    "/commands/void-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Void an invoice. Reason is mandatory.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: VoidInvoiceCommandSchema,
        response: {
          200: ActionResponseSchema,
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

      const result = await voidInvoice(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body.invoiceId,
        req.body.reason,
      );

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // ── Mark paid ──────────────────────────────────────────────────────────────
  typed.post(
    "/commands/mark-paid",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Mark a posted invoice as paid. Requires ap.invoice.markpaid permission.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: MarkPaidCommandSchema,
        response: {
          200: ActionResponseSchema,
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

      const result = await markPaid(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          invoiceId: req.body.invoiceId,
          paymentReference: req.body.paymentReference,
          paidAt: req.body.paidAt,
          reason: req.body.reason,
          idempotencyKey: req.body.idempotencyKey,
        },
      );

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // ── List invoices ──────────────────────────────────────────────────────────
  typed.get(
    "/invoices",
    {
      schema: {
        description: "List invoices with cursor pagination. Optionally filter by status.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: InvoiceStatusSchema.optional(),
        }),
        response: {
          200: InvoiceListSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listInvoices(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(serialiseInvoice),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get invoice by ID ──────────────────────────────────────────────────────
  typed.get(
    "/invoices/:invoiceId",
    {
      schema: {
        description: "Get a single invoice by ID.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ invoiceId: z.string().uuid() }),
        response: {
          200: InvoiceDetailSchema,
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

      const inv = await getInvoiceById(
        app.db,
        orgId as OrgId,
        req.params.invoiceId as InvoiceId,
      );

      if (!inv) {
        return reply.status(404).send({
          error: {
            code: "AP_INVOICE_NOT_FOUND",
            message: "Invoice not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseInvoice(inv),
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get invoice status history ─────────────────────────────────────────────
  typed.get(
    "/invoices/:invoiceId/history",
    {
      schema: {
        description: "Get the status transition history for an invoice.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ invoiceId: z.string().uuid() }),
        response: {
          200: InvoiceHistorySchema,
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

      const history = await getInvoiceHistory(
        app.db,
        orgId as OrgId,
        req.params.invoiceId as InvoiceId,
      );

      return {
        data: history.map((h) => ({
          ...h,
          occurredAt: h.occurredAt.toISOString(),
        })),
        correlationId: req.correlationId,
      };
    },
  );
}

// ── Error code → HTTP status mapping ─────────────────────────────────────────

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_INVOICE_NOT_FOUND":
      return 404 as const;
    case "IAM_INSUFFICIENT_PERMISSIONS":
    case "SHARED_FORBIDDEN":
      return 403 as const;
    case "AP_INVOICE_ALREADY_APPROVED":
    case "AP_INVOICE_ALREADY_VOIDED":
    case "AP_INVOICE_ALREADY_PAID":
    case "AP_INVOICE_INVALID_STATUS_TRANSITION":
      return 409 as const;
    default:
      return 400 as const;
  }
}

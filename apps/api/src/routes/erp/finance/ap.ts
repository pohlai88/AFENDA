/**
 * Invoice routes â€” submission, approval, rejection, void, list, get-by-id.
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
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../helpers/responses.js";
import { serializeDate } from "../../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../helpers/context.js";
import {
  CreateInvoiceCommandSchema,
  SubmitDraftInvoiceCommandSchema,
  SubmitInvoiceCommandSchema,
  ApproveInvoiceCommandSchema,
  RejectInvoiceCommandSchema,
  VoidInvoiceCommandSchema,
  BulkApproveInvoiceCommandSchema,
  BulkRejectInvoiceCommandSchema,
  BulkVoidInvoiceCommandSchema,
  BulkInvoiceResultSchema,
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
  createInvoice,
  submitDraftInvoice,
  submitInvoice,
  approveInvoice,
  rejectInvoice,
  voidInvoice,
  bulkApproveInvoices,
  bulkRejectInvoices,
  bulkVoidInvoices,
  markPaid,
  listInvoices,
  getInvoiceById,
  getInvoiceHistory,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const ActionResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

const BulkInvoiceResponseSchema = makeSuccessSchema(BulkInvoiceResultSchema);

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Context builders moved to helpers/context.ts (shared across routes)

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
    submittedAt: serializeDate(row.submittedAt),
    poReference: row.poReference,
    paidAt: serializeDate(row.paidAt),
    paidByPrincipalId: row.paidByPrincipalId,
    paymentReference: row.paymentReference,
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function invoiceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Create invoice (draft) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/create-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Create a draft invoice. Add lines via create-invoice-line, then submit via submit-draft-invoice.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateInvoiceCommandSchema,
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

      const result = await createInvoice(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ Submit draft invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/submit-draft-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Submit a draft invoice for approval. Invoice must be in draft status.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubmitDraftInvoiceCommandSchema,
        response: {
          200: InvoiceResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await submitDraftInvoice(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body.invoiceId,
      );

      if (!result.ok) {
        const status =
          result.error.code === "AP_INVOICE_NOT_FOUND"
            ? 404
            : result.error.code === "AP_INVOICE_INVALID_STATUS_TRANSITION" ||
                result.error.code === "AP_INVOICE_HAS_ACTIVE_HOLDS"
              ? 422
              : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Submit invoice (create + submit in one) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ Approve invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/approve-invoice",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Approve a submitted invoice. SoD: submitter â‰  approver.",
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
          422: ApiErrorResponseSchema,
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
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ Reject invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          422: ApiErrorResponseSchema,
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
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ Void invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          422: ApiErrorResponseSchema,
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
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ Bulk approve invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/invoices/bulk-approve",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description:
          "Approve multiple submitted invoices in a single request. Idempotent per batch.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BulkApproveInvoiceCommandSchema,
        response: {
          200: BulkInvoiceResponseSchema,
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

      const result = await bulkApproveInvoices(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body.invoiceIds as InvoiceId[],
        req.body.reason,
      );

      return {
        data: {
          ok: result.ok,
          failed: result.failed,
          failedIds: result.failedIds,
        },
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Bulk reject invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/invoices/bulk-reject",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Reject multiple submitted invoices in a single request. Reason is mandatory.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BulkRejectInvoiceCommandSchema,
        response: {
          200: BulkInvoiceResponseSchema,
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

      const result = await bulkRejectInvoices(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body.invoiceIds as InvoiceId[],
        req.body.reason,
      );

      return {
        data: {
          ok: result.ok,
          failed: result.failed,
          failedIds: result.failedIds,
        },
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Bulk void invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/invoices/bulk-void",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Void multiple invoices in a single request. Reason is mandatory.",
        tags: ["Invoices"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BulkVoidInvoiceCommandSchema,
        response: {
          200: BulkInvoiceResponseSchema,
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

      const result = await bulkVoidInvoices(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body.invoiceIds as InvoiceId[],
        req.body.reason,
      );

      return {
        data: {
          ok: result.ok,
          failed: result.failed,
          failedIds: result.failedIds,
        },
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Mark paid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          422: ApiErrorResponseSchema,
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
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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

  // â”€â”€ List invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Get invoice by ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      const inv = await getInvoiceById(app.db, orgId as OrgId, req.params.invoiceId as InvoiceId);

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

  // â”€â”€ Get invoice status history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          occurredAt: serializeDate(h.occurredAt)!,
        })),
        correlationId: req.correlationId,
      };
    },
  );
}

// â”€â”€ Error code â†’ HTTP status mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    case "AP_INVOICE_HAS_ACTIVE_HOLDS":
      return 422 as const;
    default:
      return 400 as const;
  }
}

/**
 * PaymentRun routes â€” create, list, get by ID.
 *
 * RULES:
 *   1. Use ZodTypeProvider for schema â†’ schema.body, schema.response.
 *   2. Commands: rate-limit 30/min, require auth, require org.
 *   3. Never import @afenda/db â€” use @afenda/core services.
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
import { serializeDate } from "../../../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../../helpers/context.js";
import {
  CreatePaymentRunCommandSchema,
  ApprovePaymentRunCommandSchema,
  ExecutePaymentRunCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createPaymentRun,
  approvePaymentRun,
  executePaymentRun,
  listPaymentRuns,
  getPaymentRunById,
  exportPaymentRunISO20022,
  exportPaymentRunNACHA,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PaymentRunRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  runNumber: z.string(),
  description: z.string().nullable(),
  paymentMethod: z.string(),
  currencyCode: z.string(),
  paymentDate: z.string(),
  totalAmountMinor: z.string().describe("Bigint as string"),
  totalDiscountMinor: z.string().describe("Bigint as string"),
  itemCount: z.number(),
  status: z.string(),
  approvedByPrincipalId: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
  executedByPrincipalId: z.string().uuid().nullable(),
  executedAt: z.string().datetime().nullable(),
  bankReference: z.string().nullable(),
  reversedByPrincipalId: z.string().uuid().nullable(),
  reversedAt: z.string().datetime().nullable(),
  reversalReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PaymentRunListSchema = z.object({
  data: z.array(PaymentRunRowSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serialisePaymentRun(row: {
  id: string;
  orgId: string;
  runNumber: string;
  description: string | null;
  paymentMethod: string;
  currencyCode: string;
  paymentDate: string;
  totalAmountMinor: bigint;
  totalDiscountMinor: bigint;
  itemCount: number;
  status: string;
  approvedByPrincipalId: string | null;
  approvedAt: Date | null;
  executedByPrincipalId: string | null;
  executedAt: Date | null;
  bankReference: string | null;
  reversedByPrincipalId: string | null;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    runNumber: row.runNumber,
    description: row.description,
    paymentMethod: row.paymentMethod,
    currencyCode: row.currencyCode,
    paymentDate: row.paymentDate,
    totalAmountMinor: row.totalAmountMinor.toString(),
    totalDiscountMinor: row.totalDiscountMinor.toString(),
    itemCount: row.itemCount,
    status: row.status,
    approvedByPrincipalId: row.approvedByPrincipalId,
    approvedAt: serializeDate(row.approvedAt),
    executedByPrincipalId: row.executedByPrincipalId,
    executedAt: serializeDate(row.executedAt),
    bankReference: row.bankReference,
    reversedByPrincipalId: row.reversedByPrincipalId,
    reversedAt: serializeDate(row.reversedAt),
    reversalReason: row.reversalReason,
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function paymentRunRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Create payment run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/create-payment-run",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a new payment run (DRAFT status).",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePaymentRunCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid(), runNumber: z.string() })),
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

      const result = await createPaymentRun(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          description: req.body.description,
          paymentMethod: req.body.paymentMethod,
          currencyCode: req.body.currencyCode,
          paymentDate: req.body.paymentDate,
        },
      );

      if (!result.ok) {
        return reply.status(400).send({
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

  // â”€â”€ Approve payment run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/approve-payment-run",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Approve a payment run (DRAFT â†’ APPROVED).",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApprovePaymentRunCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await approvePaymentRun(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        { paymentRunId: req.body.id },
      );

      if (!result.ok) {
        const status = result.error.code === "AP_PAYMENT_RUN_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Execute payment run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/execute-payment-run",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Execute a payment run (APPROVED â†’ EXECUTED). Marks all invoices as paid.",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ExecutePaymentRunCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await executePaymentRun(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          paymentRunId: req.body.id,
          bankReference: req.body.bankReference,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "AP_PAYMENT_RUN_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ List payment runs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/payment-runs",
    {
      schema: {
        description: "List payment runs with cursor pagination. Optionally filter by status.",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.string().optional(),
        }),
        response: {
          200: PaymentRunListSchema,
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

      const page = await listPaymentRuns(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(serialisePaymentRun),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Export payment run (ISO 20022 or NACHA) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/payment-runs/:paymentRunId/export",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Export payment run as ISO 20022 (pain.001) or NACHA ACH file. Requires debtor/originator account info via query params.",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ paymentRunId: z.string().uuid() }),
        querystring: z.discriminatedUnion("format", [
          z.object({
            format: z.literal("ISO20022"),
            debtorName: z.string().min(1),
            debtorIban: z.string().min(1),
            debtorBic: z.string().optional(),
            debtorCurrency: z.string().length(3),
          }),
          z.object({
            format: z.literal("NACHA"),
            immediateDest: z.string().length(9),
            immediateOrigin: z.string().min(1).max(10),
            companyName: z.string().min(1).max(23),
            companyId: z.string().min(1).max(10),
            companyEntryDescription: z.string().max(10).optional(),
          }),
        ]),
        response: {
          200: z.string().describe("File content (XML or NACHA text)"),
          400: ApiErrorResponseSchema,
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

      const { paymentRunId } = req.params;
      const q = req.query;

      if (q.format === "ISO20022") {
        const result = await exportPaymentRunISO20022(app.db, orgId as OrgId, {
          paymentRunId,
          debtorAccount: {
            name: q.debtorName,
            iban: q.debtorIban,
            bic: q.debtorBic,
            currency: q.debtorCurrency,
          },
        });
        if (!result.ok) {
          const status = result.error.code === "AP_PAYMENT_RUN_NOT_FOUND" ? 404 : 400;
          return reply.status(status).send({
            error: {
              code: result.error.code,
              message: result.error.message,
              details: result.error.meta,
            },
            correlationId: req.correlationId,
          });
        }
        return reply
          .header("Content-Type", "application/xml")
          .header("Content-Disposition", `attachment; filename="${result.data.fileName}"`)
          .send(result.data.content);
      }

      // NACHA
      const result = await exportPaymentRunNACHA(app.db, orgId as OrgId, {
        paymentRunId,
        originatorInfo: {
          immediateDest: q.immediateDest,
          immediateOrigin: q.immediateOrigin,
          companyName: q.companyName,
          companyId: q.companyId,
          companyEntryDescription: q.companyEntryDescription ?? "SUPPLIER",
        },
      });
      if (!result.ok) {
        const status = result.error.code === "AP_PAYMENT_RUN_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }
      return reply
        .header("Content-Type", "text/plain; charset=us-ascii")
        .header("Content-Disposition", `attachment; filename="${result.data.fileName}"`)
        .send(result.data.content);
    },
  );

  // â”€â”€ Get payment run by ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/payment-runs/:paymentRunId",
    {
      schema: {
        description: "Get a single payment run by ID.",
        tags: ["Payment Runs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ paymentRunId: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PaymentRunRowSchema),
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

      const run = await getPaymentRunById(app.db, orgId as OrgId, req.params.paymentRunId);

      if (!run) {
        return reply.status(404).send({
          error: {
            code: "AP_PAYMENT_RUN_NOT_FOUND",
            message: "Payment run not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialisePaymentRun(run),
        correlationId: req.correlationId,
      };
    },
  );
}

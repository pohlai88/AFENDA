/**
 * PaymentRun routes — create, list, get by ID.
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
  CreatePaymentRunCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createPaymentRun,
  listPaymentRuns,
  getPaymentRunById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

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
    approvedAt: row.approvedAt?.toISOString() ?? null,
    executedByPrincipalId: row.executedByPrincipalId,
    executedAt: row.executedAt?.toISOString() ?? null,
    bankReference: row.bankReference,
    reversedByPrincipalId: row.reversedByPrincipalId,
    reversedAt: row.reversedAt?.toISOString() ?? null,
    reversalReason: row.reversalReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Route registration ───────────────────────────────────────────────────────

export async function paymentRunRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create payment run ──────────────────────────────────────────────────────
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
          201: makeSuccessSchema(
            z.object({ id: z.string().uuid(), runNumber: z.string() }),
          ),
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
        buildCtx(orgId),
        buildPolicyCtx(req),
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

  // ── List payment runs ───────────────────────────────────────────────────────
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

  // ── Get payment run by ID ───────────────────────────────────────────────────
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

      const run = await getPaymentRunById(
        app.db,
        orgId as OrgId,
        req.params.paymentRunId,
      );

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

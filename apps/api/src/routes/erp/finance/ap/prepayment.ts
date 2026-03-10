/**
 * Prepayment routes — create, list, get by ID.
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
  CreatePrepaymentCommandSchema,
  ApplyPrepaymentCommandSchema,
  VoidPrepaymentCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createPrepayment,
  applyPrepayment,
  voidPrepayment,
  listPrepayments,
  getPrepaymentById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const PrepaymentRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  supplierId: z.string().uuid(),
  prepaymentNumber: z.string(),
  description: z.string().nullable(),
  currencyCode: z.string(),
  originalAmountMinor: z.string(),
  balanceMinor: z.string(),
  paymentDate: z.string(),
  paymentReference: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PrepaymentListSchema = z.object({
  data: z.array(PrepaymentRowSchema),
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

function serialisePrepayment(row: {
  id: string;
  orgId: string;
  supplierId: string;
  prepaymentNumber: string;
  description: string | null;
  currencyCode: string;
  originalAmountMinor: bigint;
  balanceMinor: bigint;
  paymentDate: string;
  paymentReference: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    prepaymentNumber: row.prepaymentNumber,
    description: row.description,
    currencyCode: row.currencyCode,
    originalAmountMinor: String(row.originalAmountMinor),
    balanceMinor: String(row.balanceMinor),
    paymentDate: row.paymentDate,
    paymentReference: row.paymentReference,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_PREPAYMENT_NOT_FOUND":
    case "AP_INVOICE_NOT_FOUND":
    case "SUP_SUPPLIER_NOT_FOUND":
      return 404 as const;
    case "AP_PREPAYMENT_NUMBER_EXISTS":
      return 409 as const;
    default:
      return 400 as const;
  }
}

// ── Route registration ───────────────────────────────────────────────────────

export async function prepaymentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create prepayment ───────────────────────────────────────────────────────
  typed.post(
    "/commands/create-prepayment",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a prepayment (advance payment to supplier).",
        tags: ["Prepayment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePrepaymentCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const paymentDate = String(req.body.paymentDate).slice(0, 10);

      const result = await createPrepayment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          supplierId: req.body.supplierId,
          prepaymentNumber: req.body.prepaymentNumber,
          description: req.body.description,
          currencyCode: req.body.currencyCode,
          amountMinor: req.body.amountMinor,
          paymentDate,
          paymentReference: req.body.paymentReference,
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

  // ── Apply prepayment to invoice ─────────────────────────────────────────────
  typed.post(
    "/commands/apply-prepayment",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Apply prepayment balance to an invoice.",
        tags: ["Prepayment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApplyPrepaymentCommandSchema,
        response: {
          200: makeSuccessSchema(
            z.object({ applicationId: z.string().uuid() }),
          ),
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

      const result = await applyPrepayment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          prepaymentId: req.body.prepaymentId,
          invoiceId: req.body.invoiceId,
          amountMinor: req.body.amountMinor,
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

      return reply.send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // ── Void prepayment ─────────────────────────────────────────────────────────
  typed.post(
    "/commands/void-prepayment",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Void an unused prepayment.",
        tags: ["Prepayment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: VoidPrepaymentCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await voidPrepayment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          prepaymentId: req.body.prepaymentId,
          reason: req.body.reason,
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

      return reply.send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // ── List prepayments ────────────────────────────────────────────────────────
  typed.get(
    "/prepayments",
    {
      schema: {
        description: "List prepayments with cursor pagination. Optionally filter by status.",
        tags: ["Prepayment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.string().optional(),
        }),
        response: {
          200: PrepaymentListSchema,
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

      const page = await listPrepayments(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(serialisePrepayment),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get prepayment by ID ─────────────────────────────────────────────────────
  typed.get(
    "/prepayments/:id",
    {
      schema: {
        description: "Get prepayment by ID.",
        tags: ["Prepayment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PrepaymentRowSchema),
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

      const row = await getPrepaymentById(app.db, orgId as OrgId, req.params.id);

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "AP_PREPAYMENT_NOT_FOUND",
            message: "Prepayment not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialisePrepayment(row),
        correlationId: req.correlationId,
      };
    },
  );
}

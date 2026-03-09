/**
 * Payment Terms routes — create, update, list, get by ID.
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
  CreatePaymentTermsCommandSchema,
  UpdatePaymentTermsCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createPaymentTerms,
  updatePaymentTerms,
  listPaymentTerms,
  getPaymentTermsById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const PaymentTermsRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string(),
  description: z.string(),
  netDays: z.number(),
  discountPercent: z.string().nullable(),
  discountDays: z.number().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PaymentTermsListSchema = z.object({
  data: z.array(PaymentTermsRowSchema),
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

function serialisePaymentTerms(row: {
  id: string;
  orgId: string;
  code: string;
  description: string;
  netDays: number;
  discountPercent: string | null;
  discountDays: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    code: row.code,
    description: row.description,
    netDays: row.netDays,
    discountPercent: row.discountPercent,
    discountDays: row.discountDays,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_PAYMENT_TERMS_NOT_FOUND":
      return 404 as const;
    case "AP_PAYMENT_TERMS_CODE_EXISTS":
      return 409 as const;
    default:
      return 400 as const;
  }
}

// ── Route registration ───────────────────────────────────────────────────────

export async function paymentTermsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create payment terms ───────────────────────────────────────────────────
  typed.post(
    "/commands/create-payment-terms",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create payment terms (e.g., NET30, 2/10NET30).",
        tags: ["Payment Terms"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePaymentTermsCommandSchema,
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

      const result = await createPaymentTerms(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          code: req.body.code,
          description: req.body.description,
          netDays: req.body.netDays,
          discountPercent: req.body.discountPercent,
          discountDays: req.body.discountDays,
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

  // ── Update payment terms ─────────────────────────────────────────────────────
  typed.post(
    "/commands/update-payment-terms",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Update payment terms.",
        tags: ["Payment Terms"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdatePaymentTermsCommandSchema,
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

      const result = await updatePaymentTerms(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          id: req.body.id,
          description: req.body.description,
          netDays: req.body.netDays,
          discountPercent: req.body.discountPercent,
          discountDays: req.body.discountDays,
          status: req.body.status,
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

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // ── List payment terms ───────────────────────────────────────────────────────
  typed.get(
    "/payment-terms",
    {
      schema: {
        description: "List payment terms with cursor pagination. Optionally filter by status.",
        tags: ["Payment Terms"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.string().optional(),
        }),
        response: {
          200: PaymentTermsListSchema,
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

      const page = await listPaymentTerms(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(serialisePaymentTerms),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get payment terms by ID ──────────────────────────────────────────────────
  typed.get(
    "/payment-terms/:id",
    {
      schema: {
        description: "Get payment terms by ID.",
        tags: ["Payment Terms"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PaymentTermsRowSchema),
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

      const terms = await getPaymentTermsById(app.db, orgId as OrgId, req.params.id);

      if (!terms) {
        return reply.status(404).send({
          error: {
            code: "AP_PAYMENT_TERMS_NOT_FOUND",
            message: "Payment terms not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialisePaymentTerms(terms),
        correlationId: req.correlationId,
      };
    },
  );
}

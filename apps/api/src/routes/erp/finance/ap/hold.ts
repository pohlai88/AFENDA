/**
 * Hold routes — create hold, release hold, get by ID, list by invoice.
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
  CreateHoldCommandSchema,
  ReleaseHoldCommandSchema,
  type OrgId,
  type CorrelationId,
  type InvoiceId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createHold,
  releaseHold,
  findHoldsByInvoice,
  getHoldById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const HoldRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  holdType: z.string(),
  holdReason: z.string(),
  status: z.string(),
  createdByPrincipalId: z.string().uuid().nullable(),
  releasedAt: z.string().datetime().nullable(),
  releasedByPrincipalId: z.string().uuid().nullable(),
  releaseReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const HoldListSchema = z.object({
  data: z.array(HoldRowSchema),
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

function serialiseHold(row: {
  id: string;
  orgId: string;
  invoiceId: string;
  holdType: string;
  holdReason: string;
  status: string;
  createdByPrincipalId: string | null;
  releasedAt: Date | null;
  releasedByPrincipalId: string | null;
  releaseReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    invoiceId: row.invoiceId,
    holdType: row.holdType,
    holdReason: row.holdReason,
    status: row.status,
    createdByPrincipalId: row.createdByPrincipalId,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    releasedByPrincipalId: row.releasedByPrincipalId,
    releaseReason: row.releaseReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapHoldErrorStatus(code: string) {
  switch (code) {
    case "AP_HOLD_NOT_FOUND":
    case "AP_INVOICE_NOT_FOUND":
      return 404 as const;
    case "AP_HOLD_ALREADY_RELEASED":
      return 409 as const;
    default:
      return 400 as const;
  }
}

// ── Route registration ───────────────────────────────────────────────────────

export async function holdRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create hold ────────────────────────────────────────────────────────────
  typed.post(
    "/commands/create-hold",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Place a hold on an invoice. Blocks approval until released.",
        tags: ["Holds"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateHoldCommandSchema,
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

      const result = await createHold(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          invoiceId: req.body.invoiceId,
          holdType: req.body.holdType,
          holdReason: req.body.holdReason,
        },
      );

      if (!result.ok) {
        return reply.status(mapHoldErrorStatus(result.error.code)).send({
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

  // ── Release hold ──────────────────────────────────────────────────────────
  typed.post(
    "/commands/release-hold",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Release a hold on an invoice. Invoice can then be approved.",
        tags: ["Holds"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ReleaseHoldCommandSchema,
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

      const result = await releaseHold(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          holdId: req.body.holdId,
          releaseReason: req.body.releaseReason,
        },
      );

      if (!result.ok) {
        return reply.status(mapHoldErrorStatus(result.error.code)).send({
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

  // ── Get hold by ID ──────────────────────────────────────────────────────────
  typed.get(
    "/holds/:holdId",
    {
      schema: {
        description: "Get a single hold by ID.",
        tags: ["Holds"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ holdId: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(HoldRowSchema),
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

      const hold = await getHoldById(app.db, orgId as OrgId, req.params.holdId);

      if (!hold) {
        return reply.status(404).send({
          error: {
            code: "AP_HOLD_NOT_FOUND",
            message: "Hold not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseHold(hold),
        correlationId: req.correlationId,
      };
    },
  );

  // ── List holds by invoice ───────────────────────────────────────────────────
  typed.get(
    "/invoices/:invoiceId/holds",
    {
      schema: {
        description: "List all holds for an invoice (active and released).",
        tags: ["Holds"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ invoiceId: z.string().uuid() }),
        response: {
          200: HoldListSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const holds = await findHoldsByInvoice(
        app.db,
        orgId as OrgId,
        req.params.invoiceId as InvoiceId,
      );

      return {
        data: holds.map(serialiseHold),
        correlationId: req.correlationId,
      };
    },
  );
}

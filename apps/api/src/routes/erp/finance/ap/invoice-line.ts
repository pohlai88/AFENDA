/**
 * Invoice Line routes — create, update, delete, list by invoice, get by ID.
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
  CreateInvoiceLineCommandSchema,
  UpdateInvoiceLineCommandSchema,
  DeleteInvoiceLineCommandSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine,
  listInvoiceLines,
  getInvoiceLineById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// ── Response schemas ─────────────────────────────────────────────────────────

const InvoiceLineRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  lineNumber: z.number(),
  description: z.string(),
  quantity: z.number(),
  unitPriceMinor: z.string(),
  amountMinor: z.string(),
  glAccountId: z.string().uuid().nullable(),
  taxCode: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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

function serialiseInvoiceLine(row: {
  id: string;
  orgId: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: bigint;
  amountMinor: bigint;
  glAccountId: string | null;
  taxCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    invoiceId: row.invoiceId,
    lineNumber: row.lineNumber,
    description: row.description,
    quantity: row.quantity,
    unitPriceMinor: String(row.unitPriceMinor),
    amountMinor: String(row.amountMinor),
    glAccountId: row.glAccountId,
    taxCode: row.taxCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_INVOICE_NOT_FOUND":
    case "AP_INVOICE_LINE_NOT_FOUND":
      return 404 as const;
    case "AP_INVOICE_LINE_DUPLICATE_NUMBER":
      return 409 as const;
    case "AP_INVOICE_INVALID_STATUS_TRANSITION":
      return 422 as const;
    default:
      return 400 as const;
  }
}

// ── Route registration ───────────────────────────────────────────────────────

export async function invoiceLineRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── Create invoice line ────────────────────────────────────────────────────
  typed.post(
    "/commands/create-invoice-line",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create an invoice line (invoice must be in draft).",
        tags: ["Invoice Line"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateInvoiceLineCommandSchema,
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

      const result = await createInvoiceLine(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          invoiceId: req.body.invoiceId,
          lineNumber: req.body.lineNumber,
          description: req.body.description,
          quantity: req.body.quantity,
          unitPriceMinor: req.body.unitPriceMinor,
          glAccountId: req.body.glAccountId,
          taxCode: req.body.taxCode,
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

  // ── Update invoice line ─────────────────────────────────────────────────────
  typed.post(
    "/commands/update-invoice-line",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Update an invoice line (invoice must be in draft).",
        tags: ["Invoice Line"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateInvoiceLineCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await updateInvoiceLine(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          id: req.body.id,
          description: req.body.description,
          quantity: req.body.quantity,
          unitPriceMinor: req.body.unitPriceMinor,
          glAccountId: req.body.glAccountId,
          taxCode: req.body.taxCode,
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

  // ── Delete invoice line ────────────────────────────────────────────────────
  typed.post(
    "/commands/delete-invoice-line",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Delete an invoice line (invoice must be in draft).",
        tags: ["Invoice Line"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeleteInvoiceLineCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await deleteInvoiceLine(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body.id,
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

  // ── List lines by invoice ───────────────────────────────────────────────────
  typed.get(
    "/invoices/:invoiceId/lines",
    {
      schema: {
        description: "List invoice lines for an invoice.",
        tags: ["Invoice Line"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ invoiceId: z.string().uuid() }),
        response: {
          200: z.object({
            data: z.array(InvoiceLineRowSchema),
            correlationId: z.string().uuid(),
          }),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const lines = await listInvoiceLines(
        app.db,
        orgId as OrgId,
        req.params.invoiceId,
      );

      return {
        data: lines.map(serialiseInvoiceLine),
        correlationId: req.correlationId,
      };
    },
  );

  // ── Get invoice line by ID ───────────────────────────────────────────────────
  typed.get(
    "/invoice-lines/:id",
    {
      schema: {
        description: "Get invoice line by ID.",
        tags: ["Invoice Line"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(InvoiceLineRowSchema),
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

      const row = await getInvoiceLineById(app.db, orgId as OrgId, req.params.id);

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "AP_INVOICE_LINE_NOT_FOUND",
            message: "Invoice line not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseInvoiceLine(row),
        correlationId: req.correlationId,
      };
    },
  );
}

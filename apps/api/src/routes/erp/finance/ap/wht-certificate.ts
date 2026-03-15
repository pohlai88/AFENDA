/**
 * WHT Certificate routes â€” create, list, get by ID.
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
  CreateWhtCertificateCommandSchema,
  IssueWhtCertificateCommandSchema,
  SubmitWhtCertificateCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createWhtCertificate,
  issueWhtCertificate,
  submitWhtCertificate,
  listWhtCertificates,
  getWhtCertificateById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const WhtCertificateRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  supplierId: z.string().uuid(),
  certificateNumber: z.string(),
  whtType: z.string(),
  jurisdictionCode: z.string(),
  currencyCode: z.string(),
  grossAmountMinor: z.string(),
  whtRatePercent: z.string(),
  whtAmountMinor: z.string(),
  netAmountMinor: z.string(),
  taxPeriod: z.string(),
  certificateDate: z.string(),
  paymentRunId: z.string().uuid().nullable(),
  status: z.string(),
  issuedAt: z.string().datetime().nullable(),
  submittedAt: z.string().datetime().nullable(),
  taxAuthorityReference: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const WhtCertificateListSchema = z.object({
  data: z.array(WhtCertificateRowSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serialiseWhtCertificate(row: {
  id: string;
  orgId: string;
  supplierId: string;
  certificateNumber: string;
  whtType: string;
  jurisdictionCode: string;
  currencyCode: string;
  grossAmountMinor: bigint;
  whtRatePercent: string;
  whtAmountMinor: bigint;
  netAmountMinor: bigint;
  taxPeriod: string;
  certificateDate: string;
  paymentRunId: string | null;
  status: string;
  issuedAt: Date | null;
  submittedAt: Date | null;
  taxAuthorityReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    certificateNumber: row.certificateNumber,
    whtType: row.whtType,
    jurisdictionCode: row.jurisdictionCode,
    currencyCode: row.currencyCode,
    grossAmountMinor: String(row.grossAmountMinor),
    whtRatePercent: row.whtRatePercent,
    whtAmountMinor: String(row.whtAmountMinor),
    netAmountMinor: String(row.netAmountMinor),
    taxPeriod: row.taxPeriod,
    certificateDate: row.certificateDate,
    paymentRunId: row.paymentRunId,
    status: row.status,
    issuedAt: serializeDate(row.issuedAt),
    submittedAt: serializeDate(row.submittedAt),
    taxAuthorityReference: row.taxAuthorityReference,
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_WHT_CERTIFICATE_NOT_FOUND":
    case "SUP_SUPPLIER_NOT_FOUND":
      return 404 as const;
    case "AP_WHT_CERTIFICATE_NUMBER_EXISTS":
      return 409 as const;
    default:
      return 400 as const;
  }
}

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function whtCertificateRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Create WHT certificate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/create-wht-certificate",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a WHT (withholding tax) certificate.",
        tags: ["WHT Certificate"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateWhtCertificateCommandSchema,
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

      const certDate = String(req.body.certificateDate).slice(0, 10);

      const result = await createWhtCertificate(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          supplierId: req.body.supplierId,
          certificateNumber: req.body.certificateNumber,
          whtType: req.body.whtType,
          jurisdictionCode: req.body.jurisdictionCode,
          currencyCode: req.body.currencyCode,
          grossAmountMinor: req.body.grossAmountMinor,
          whtRatePercent: req.body.whtRatePercent,
          whtAmountMinor: req.body.whtAmountMinor,
          netAmountMinor: req.body.netAmountMinor,
          taxPeriod: req.body.taxPeriod,
          certificateDate: certDate,
          paymentRunId: req.body.paymentRunId,
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

  // â”€â”€ Issue WHT certificate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/issue-wht-certificate",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Issue a WHT certificate to the supplier (DRAFT â†’ ISSUED).",
        tags: ["WHT Certificate"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: IssueWhtCertificateCommandSchema,
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

      const result = await issueWhtCertificate(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        { whtCertificateId: req.body.whtCertificateId },
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

  // â”€â”€ Submit WHT certificate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/submit-wht-certificate",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Submit a WHT certificate to the tax authority (ISSUED â†’ SUBMITTED).",
        tags: ["WHT Certificate"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubmitWhtCertificateCommandSchema,
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

      const result = await submitWhtCertificate(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          whtCertificateId: req.body.whtCertificateId,
          taxAuthorityReference: req.body.taxAuthorityReference,
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

  // â”€â”€ List WHT certificates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/wht-certificates",
    {
      schema: {
        description: "List WHT certificates with cursor pagination. Optionally filter by status.",
        tags: ["WHT Certificate"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.string().optional(),
        }),
        response: {
          200: WhtCertificateListSchema,
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

      const page = await listWhtCertificates(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(serialiseWhtCertificate),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Get WHT certificate by ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/wht-certificates/:id",
    {
      schema: {
        description: "Get WHT certificate by ID.",
        tags: ["WHT Certificate"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(WhtCertificateRowSchema),
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

      const row = await getWhtCertificateById(app.db, orgId as OrgId, req.params.id);

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "AP_WHT_CERTIFICATE_NOT_FOUND",
            message: "WHT certificate not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseWhtCertificate(row),
        correlationId: req.correlationId,
      };
    },
  );
}

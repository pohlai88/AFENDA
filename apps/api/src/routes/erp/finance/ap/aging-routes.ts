/**
 * AP Aging Report API Routes
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
import {
  getAgingReport,
  getInvoicesByAgingBucket,
  type SupplierAging,
  type AgingBucket,
} from "@afenda/core";
import type { OrgId } from "@afenda/contracts";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AgingBucketSchema = z.object({
  bucket: z.enum(["current", "1-30", "31-60", "61-90", "90+"]),
  minDays: z.number(),
  maxDays: z.number().nullable(),
  totalAmountMinor: z.string(),
  invoiceCount: z.number(),
  invoices: z.array(z.string()),
});

const SupplierAgingSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  totalOutstandingMinor: z.string(),
  invoiceCount: z.number(),
  buckets: z.array(AgingBucketSchema),
});

const AgingReportResponseSchema = makeSuccessSchema(
  z.object({
    asOfDate: z.string(),
    suppliers: z.array(SupplierAgingSchema),
    summary: z.object({
      totalOutstandingMinor: z.string(),
      totalInvoiceCount: z.number(),
      byBucket: z.array(AgingBucketSchema),
    }),
  }),
);

const InvoiceAgingRowSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  supplierId: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  amountMinor: z.string(),
  balanceMinor: z.string(),
  daysOverdue: z.number(),
  status: z.string(),
});

const InvoicesByBucketResponseSchema = makeSuccessSchema(
  z.object({
    invoices: z.array(InvoiceAgingRowSchema),
  }),
);

export default async function apAgingRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/v1/ap/aging
   * Get AP aging report with bucket breakdowns
   */
  typedApp.get(
    "/api/v1/ap/aging",
    {
      schema: {
        querystring: z.object({
          asOfDate: z.string().optional().describe("ISO date string"),
          supplierId: z.string().uuid().optional(),
        }),
        response: {
          200: AgingReportResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
        tags: ["AP Aging"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const { asOfDate: asOfDateStr, supplierId } = req.query;
      const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

      const result = await getAgingReport(app.db, {
        orgId,
        asOfDate,
        supplierId,
      });

      if (!result.ok) {
        return reply.status(500).send({
          error: {
            code: result.error,
            message: "Failed to generate aging report",
          },
          correlationId: req.correlationId,
        });
      }

      // Convert BigInts to strings for JSON serialization
      const response = {
        asOfDate: serializeDate(result.data.asOfDate)!.slice(0, 10),
        suppliers: result.data.suppliers.map((s: SupplierAging) => ({
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          totalOutstandingMinor: s.totalOutstandingMinor.toString(),
          invoiceCount: s.invoiceCount,
          buckets: s.buckets.map((b: AgingBucket) => ({
            bucket: b.bucket,
            minDays: b.minDays,
            maxDays: b.maxDays,
            totalAmountMinor: b.totalAmountMinor.toString(),
            invoiceCount: b.invoiceCount,
            invoices: [...b.invoices], // Convert readonly array
          })),
        })),
        summary: {
          totalOutstandingMinor: result.data.summary.totalOutstandingMinor.toString(),
          totalInvoiceCount: result.data.summary.totalInvoiceCount,
          byBucket: result.data.summary.byBucket.map((b: AgingBucket) => ({
            bucket: b.bucket,
            minDays: b.minDays,
            maxDays: b.maxDays,
            totalAmountMinor: b.totalAmountMinor.toString(),
            invoiceCount: b.invoiceCount,
            invoices: [...b.invoices], // Convert readonly array
          })),
        },
      };

      return reply.send({
        data: response,
        correlationId: req.correlationId,
      });
    },
  );

  /**
   * GET /api/v1/ap/aging/:bucket/invoices
   * Get invoices in a specific aging bucket for drill-down
   */
  typedApp.get(
    "/api/v1/ap/aging/:bucket/invoices",
    {
      schema: {
        params: z.object({
          bucket: z.enum(["current", "1-30", "31-60", "61-90", "90+"]),
        }),
        querystring: z.object({
          asOfDate: z.string().optional().describe("ISO date string"),
        }),
        response: {
          200: InvoicesByBucketResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
        tags: ["AP Aging"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const { bucket } = req.params;
      const { asOfDate: asOfDateStr } = req.query;
      const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

      const invoices = await getInvoicesByAgingBucket(app.db, {
        orgId,
        bucket,
        asOfDate,
      });

      return reply.send({
        data: { invoices },
        correlationId: req.correlationId,
      });
    },
  );
}

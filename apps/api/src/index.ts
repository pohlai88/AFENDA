import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// OTel bootstrap is handled by --import ./src/otel-preload.ts
// (must run before static imports so http/pg can be monkey-patched)

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod";
import { z } from "zod";
import { CorrelationIdHeader, OrgIdHeader } from "@afenda/contracts";
import { validateEnv, ApiEnvSchema, checkDbHealth, resolveOrgId, redactEnv } from "@afenda/core";

// Plugins
import { dbPlugin } from "./plugins/db.js";
import { authPlugin } from "./plugins/auth.js";
import { idempotencyPlugin } from "./plugins/idempotency.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { otelEnrichmentPlugin } from "./plugins/otel.js";

// Helpers
import { ERR } from "./helpers/responses.js";

// Routes
import { authRoutes } from "./routes/kernel/auth.js";
import { evidenceRoutes } from "./routes/kernel/evidence.js";
import { iamRoutes } from "./routes/kernel/identity.js";
import { invoiceRoutes } from "./routes/erp/finance/ap.js";
import { glRoutes } from "./routes/erp/finance/gl.js";
import { auditRoutes } from "./routes/kernel/audit.js";
import { capabilitiesRoutes } from "./routes/kernel/capabilities.js";
import { supplierRoutes } from "./routes/erp/supplier.js";
import { settingsRoutes } from "./routes/kernel/settings.js";
import { customFieldRoutes } from "./routes/kernel/custom-fields.js";
import { organizationRoutes } from "./routes/kernel/organization.js";
import { numberingRoutes } from "./routes/kernel/numbering.js";
import { exportPdfRoutes } from "./routes/kernel/export-pdf.js";
// AP sub-entity routes
import { holdRoutes } from "./routes/erp/finance/ap/hold.js";
import { invoiceLineRoutes } from "./routes/erp/finance/ap/invoice-line.js";
import { matchToleranceRoutes } from "./routes/erp/finance/ap/match-tolerance.js";
import { paymentRunRoutes } from "./routes/erp/finance/ap/payment-run.js";
import { paymentRunItemRoutes } from "./routes/erp/finance/ap/payment-run-item.js";
import { paymentTermsRoutes } from "./routes/erp/finance/ap/payment-terms.js";
import { prepaymentRoutes } from "./routes/erp/finance/ap/prepayment.js";
import { whtCertificateRoutes } from "./routes/erp/finance/ap/wht-certificate.js";
import { purchaseOrderRoutes } from "./routes/erp/purchasing/purchase-order.js";
import { receiptRoutes } from "./routes/erp/purchasing/receipt.js";
// Supplier sub-entity routes (templates — uncomment when implemented)
// import { supplierSiteRoutes } from "./routes/erp/supplier/supplier-site.js";
// import { supplierBankAccountRoutes } from "./routes/erp/supplier/supplier-bank-account.js";

// Type augmentations (side-effect import — registers Fastify generics)
import "./types.js";

// ── Validate environment before anything else ────────────────────────────────
const env = validateEnv(ApiEnvSchema);

const isDev = process.env.NODE_ENV !== "production";

// ─── Build app (exported for testing) ────────────────────────────────────────
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
      ...(isDev
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            },
          }
        : {}),
    },
  });

  // ── Zod type provider — auto-validates request body/querystring/params ────
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Plugins — registration order determines onRequest hook firing order ─────
  //
  //   1. dbPlugin          → decorates app.db (sync, no hooks)
  //   2. CORS              → preflight + headers (onRequest)
  //   3. correlationId     → onRequest: set req.correlationId
  //   4. orgSlug           → onRequest: set req.orgSlug / req.orgId
  //   5. authPlugin        → onRequest: reads correlationId+orgSlug, sets req.ctx
  //   6. rateLimit         → onRequest: keys by req.ctx.principalId (set by step 5)
  //   7. idempotencyPlugin → preHandler: dedup writes

  await app.register(dbPlugin);

  // ── OpenAPI spec + Scalar docs UI ──────────────────────────────────────────
  await app.register(swaggerPlugin);

  // ── CORS ───────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : true,
    credentials: true,
  });

  // ── Correlation ID ─────────────────────────────────────────────────────────
  app.addHook("onRequest", async (req, reply) => {
    const incoming = req.headers[CorrelationIdHeader] as string | undefined;
    const correlationId = incoming ?? crypto.randomUUID();
    req.correlationId = correlationId;
    reply.header(CorrelationIdHeader, correlationId);
  });

  // ── Org slug → UUID resolution (ADR-0003) ─────────────────────────────────
  const orgCache = new Map<string, string>(); // slug → UUID

  app.addHook("onRequest", async (req) => {
    const host = req.hostname ?? "";
    const subdomainMatch = host.match(/^([^.]+)\./);
    const slug = subdomainMatch?.[1] ?? (req.headers[OrgIdHeader] as string | undefined) ?? "demo";

    req.orgSlug = slug;

    // Resolve UUID (cached)
    if (orgCache.has(slug)) {
      req.orgId = orgCache.get(slug);
    } else {
      const id = await resolveOrgId(app.db, slug);
      if (id) {
        orgCache.set(slug, id);
        req.orgId = id;
      }
    }
  });

  // ── Auth (onRequest — must be after correlationId + orgSlug hooks) ─────────
  await app.register(authPlugin);

  // ── OTel enrichment (after auth — stamps org/principal/correlationId on span)
  await app.register(otelEnrichmentPlugin);

  // ── Rate limiting (onRequest — must be after authPlugin so req.ctx is set) ─
  // Unauthenticated requests: 100 req/min (keyed by IP).
  // Authenticated requests:   300 req/min (keyed by principalId).
  // Per-route overrides are set via route config.rateLimit.
  await app.register(rateLimit, {
    global: true,
    max: (req) => (req.ctx?.principalId ? 300 : 100),
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ctx?.principalId ?? req.ip,
  });

  // ── Idempotency ────────────────────────────────────────────────────────────
  await app.register(idempotencyPlugin);

  // ── Error envelope (Stripe-inspired) ──────────────────────────────────────
  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const correlationId = req.correlationId ?? crypto.randomUUID();
    const statusCode = err.statusCode ?? 500;

    app.log.error({ correlationId, err }, "request error");

    const message = statusCode >= 500 ? "Internal server error" : err.message;

    reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? ERR.INTERNAL : ERR.VALIDATION,
        message,
      },
      correlationId,
    });
  });

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get(
    "/healthz",
    {
      schema: {
        description: "Liveness probe — returns 200 if the process is alive.",
        tags: ["Health"],
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    async () => ({ ok: true }),
  );

  app.get(
    "/readyz",
    {
      schema: {
        description: "Readiness probe — returns 200 if DB connection and migrations are current.",
        tags: ["Health"],
        response: {
          200: z.object({
            ok: z.boolean(),
            db: z.string(),
            latencyMs: z.number(),
            migrationHash: z.string().nullable(),
            migratedAt: z.number().nullable(),
          }),
        },
      },
    },
    async () => {
      const health = await checkDbHealth(app.db);
      return {
        ok: health.ok,
        db: health.ok ? "connected" : "error",
        latencyMs: health.latencyMs,
        migrationHash: health.migrationHash ?? null,
        migratedAt: health.migratedAt ?? null,
      };
    },
  );

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.get(
    "/v1",
    {
      schema: {
        description: "API version info.",
        tags: ["Health"],
        response: {
          200: z.object({
            service: z.string(),
            version: z.string(),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
    async () => ({
      service: "afenda-api",
      version: "v1",
      timestamp: new Date().toISOString(),
    }),
  );

  // ── Domain routes ──────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/v1" });
  await app.register(evidenceRoutes, { prefix: "/v1" });
  await app.register(iamRoutes, { prefix: "/v1" });
  await app.register(invoiceRoutes, { prefix: "/v1" });
  await app.register(glRoutes, { prefix: "/v1" });
  await app.register(auditRoutes, { prefix: "/v1" });
  await app.register(capabilitiesRoutes, { prefix: "/v1" });
  await app.register(supplierRoutes, { prefix: "/v1" });
  await app.register(settingsRoutes, { prefix: "/v1" });
  await app.register(customFieldRoutes, { prefix: "/v1" });
  await app.register(organizationRoutes, { prefix: "/v1" });
  await app.register(numberingRoutes, { prefix: "/v1" });
  await app.register(exportPdfRoutes, { prefix: "/v1" });
  // AP sub-entity routes
  await app.register(holdRoutes, { prefix: "/v1" });
  await app.register(invoiceLineRoutes, { prefix: "/v1" });
  await app.register(matchToleranceRoutes, { prefix: "/v1" });
  await app.register(paymentRunRoutes, { prefix: "/v1" });
  await app.register(paymentRunItemRoutes, { prefix: "/v1" });
  await app.register(paymentTermsRoutes, { prefix: "/v1" });
  await app.register(prepaymentRoutes, { prefix: "/v1" });
  await app.register(whtCertificateRoutes, { prefix: "/v1" });
  await app.register(purchaseOrderRoutes, { prefix: "/v1" });
  await app.register(receiptRoutes, { prefix: "/v1" });
  // Supplier sub-entity routes (templates — uncomment when implemented)
  // await app.register(supplierSiteRoutes, { prefix: "/v1" });
  // await app.register(supplierBankAccountRoutes, { prefix: "/v1" });

  return app;
}

// ─── Bootstrap (skip when imported as a module by tests) ──────────────────────
if (!process.env["VITEST"]) {
  const port = env.API_PORT;

  const app = await buildApp();
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info({ config: redactEnv(env) }, "API config (redacted)");
  app.log.info(`API listening on :${port}`);
  app.log.info(`  GET  /healthz`);
  app.log.info(`  GET  /readyz`);
  app.log.info(`  GET  /v1`);
  app.log.info(`  GET  /v1/me`);
  app.log.info(`  GET  /v1/me/contexts`);
  app.log.info(`  GET  /v1/documents`);
  app.log.info(`  POST /v1/evidence/presign`);
  app.log.info(`  POST /v1/documents`);
  app.log.info(`  POST /v1/commands/attach-evidence`);
  app.log.info(`  POST /v1/commands/submit-invoice`);
  app.log.info(`  POST /v1/commands/approve-invoice`);
  app.log.info(`  POST /v1/commands/reject-invoice`);
  app.log.info(`  POST /v1/commands/void-invoice`);
  app.log.info(`  POST /v1/invoices/bulk-approve`);
  app.log.info(`  POST /v1/invoices/bulk-reject`);
  app.log.info(`  POST /v1/invoices/bulk-void`);
  app.log.info(`  POST /v1/commands/mark-paid`);
  app.log.info(`  GET  /v1/invoices`);
  app.log.info(`  GET  /v1/invoices/:invoiceId`);
  app.log.info(`  GET  /v1/invoices/:invoiceId/history`);
  app.log.info(`  POST /v1/commands/post-to-gl`);
  app.log.info(`  POST /v1/commands/reverse-entry`);
  app.log.info(`  GET  /v1/gl/journal-entries`);
  app.log.info(`  GET  /v1/gl/journal-entries/:entryId`);
  app.log.info(`  GET  /v1/gl/accounts`);
  app.log.info(`  GET  /v1/gl/trial-balance`);
  app.log.info(`  GET  /v1/audit-logs`);
  app.log.info(`  GET  /v1/audit-logs/:entityType/:entityId`);
  app.log.info(`  GET  /v1/capabilities/:entityKey`);
  app.log.info(`  GET  /v1/docs              (API reference)`);
  app.log.info(`  GET  /v1/docs/openapi.json (OpenAPI spec)`);
  app.log.info(`  GET  /v1/settings`);
  app.log.info(`  PATCH /v1/settings`);
  app.log.info(`  GET  /v1/custom-fields`);
  app.log.info(`  POST /v1/custom-fields`);
  app.log.info(`  PATCH /v1/custom-fields/:id`);
  app.log.info(`  DELETE /v1/custom-fields/:id`);
  app.log.info(`  GET  /v1/custom-fields/entity-types`);
  app.log.info(`  PATCH /v1/suppliers/:id/custom-fields`);
  app.log.info(`  GET  /v1/organization`);
  app.log.info(`  PATCH /v1/organization`);
  app.log.info(`  GET  /v1/organization/members`);
  app.log.info(`  GET  /v1/settings/numbering`);
  app.log.info(`  PATCH /v1/settings/numbering`);
}

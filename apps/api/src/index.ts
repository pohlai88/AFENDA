import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { CorrelationIdHeader, OrgIdHeader } from "@afenda/contracts";
import {
  validateEnv,
  ApiEnvSchema,
  checkDbHealth,
  resolveOrgId,
  redactEnv,
} from "@afenda/core";

// Plugins
import { dbPlugin } from "./plugins/db.js";
import { authPlugin } from "./plugins/auth.js";
import { idempotencyPlugin } from "./plugins/idempotency.js";

// Routes
import { evidenceRoutes } from "./routes/evidence.js";
import { iamRoutes } from "./routes/iam.js";

// Type augmentations (side-effect import — registers Fastify generics)
import "./types.js";

// ── Validate environment before anything else ────────────────────────────────
const env = validateEnv(ApiEnvSchema);

// ─── Build app (exported for testing) ────────────────────────────────────────
export async function buildApp() {
  const app = Fastify({ logger: true });

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
    const slug =
      subdomainMatch?.[1] ??
      (req.headers[OrgIdHeader] as string | undefined) ??
      "demo";

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

    const message =
      statusCode >= 500 ? "Internal server error" : err.message;

    reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? "internalError" : "requestError",
        message,
      },
      correlationId,
    });
  });

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get("/healthz", async () => ({ ok: true }));

  app.get("/readyz", async () => {
    const health = await checkDbHealth(app.db);
    return {
      ok: health.ok,
      db: health.ok ? "connected" : "error",
      latencyMs: health.latencyMs,
      migration: health.migration ?? null,
    };
  });

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.get("/v1", async () => ({
    service: "afenda-api",
    version: "v1",
    timestamp: new Date().toISOString(),
  }));

  // ── Domain routes ──────────────────────────────────────────────────────────
  await app.register(evidenceRoutes, { prefix: "/v1" });
  await app.register(iamRoutes, { prefix: "/v1" });

  return app;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
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
app.log.info(`  POST /v1/evidence/presign`);
app.log.info(`  POST /v1/documents`);
app.log.info(`  POST /v1/commands/attach-evidence`);

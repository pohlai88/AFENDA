/**
 * Fastify plugin: OpenAPI spec generation + Scalar API docs.
 *
 * Registers:
 *   1. `@fastify/swagger`              → generates OpenAPI 3.1 spec from Zod route schemas
 *   2. `@scalar/fastify-api-reference`  → interactive API explorer UI at /v1/docs
 *
 * The spec is derived from Zod schemas attached to routes via
 * `fastify-type-provider-zod`. No manual OpenAPI maintenance needed —
 * contracts are the single source of truth.
 *
 * Skip list excludes infrastructure endpoints (/healthz, /readyz) from docs.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import {
  jsonSchemaTransform,
  createJsonSchemaTransform,
} from "fastify-type-provider-zod";

export const swaggerPlugin = fp(async function swaggerPlugin(
  app: FastifyInstance,
) {
  // ── OpenAPI 3.1 spec generation ──────────────────────────────────────────
  const transform = createJsonSchemaTransform({
    skipList: [
      "/healthz",
      "/readyz",
      "/v1/docs",
      "/v1/docs/*",
      "/v1/docs/openapi.json",
    ],
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "AFENDA API",
        description:
          "Business Truth Engine — command + query API for invoices, approvals, GL postings, evidence, and IAM.",
        version: "1.0.0",
        contact: {
          name: "AFENDA Team",
        },
      },
      servers: [
        {
          url: "http://localhost:3001",
          description: "Local development",
        },
      ],
      tags: [
        {
          name: "Health",
          description: "Infrastructure health & readiness checks",
        },
        {
          name: "IAM",
          description:
            "Identity & access management — principal info, context switching",
        },
        {
          name: "Evidence",
          description:
            "Document registration, presigned uploads, evidence attachment",
        },
        {
          name: "Invoices",
          description: "Invoice submission, approval, and lifecycle (Sprint 1)",
        },
        {
          name: "GL",
          description:
            "General Ledger — journal entries, chart of accounts (Sprint 1)",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWE",
            description:
              "NextAuth v4 encrypted JWT. In dev mode, use `X-Dev-User-Email` header instead.",
          },
          devAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Dev-User-Email",
            description:
              "Development-only: principal email address for auth bypass.",
          },
        },
      },
    },
    transform,
  });

  // ── Scalar API reference UI ──────────────────────────────────────────────
  await app.register(scalarApiReference, {
    routePrefix: "/v1/docs",
    configuration: {
      theme: "kepler",
      darkMode: true,
      layout: "modern",
      defaultHttpClient: {
        targetKey: "node",
        clientKey: "fetch",
      },
      metaData: {
        title: "AFENDA API Reference",
      },
    },
  });

  app.log.info("OpenAPI spec at /v1/docs/openapi.json");
  app.log.info("API reference UI at /v1/docs");
});

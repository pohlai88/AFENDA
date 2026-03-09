/**
 * TEMPLATE: Fastify route for apps/api.
 *
 * Copy this file to: apps/api/src/routes/<pillar>/<module>/<entity>.ts
 * Then: find-replace Entity/entity with your domain name.
 *
 * RULES:
 *   1. Use ZodTypeProvider for schema → schema.body, schema.response.
 *   2. OpenAPI tags, descriptions, and security are required.
 *   3. Commands: rate-limit 30/min, require auth, require org.
 *   4. Queries: use cursor pagination schemas from contracts.
 *   5. Never import @afenda/db — use @afenda/core services.
 *   6. Register this route in apps/api/src/index.ts.
 */

// import type { FastifyInstance } from "fastify";
// import type { ZodTypeProvider } from "fastify-type-provider-zod";
// import { z } from "zod";
// import {
//   CreateEntityCommandSchema,
//   CursorParamsSchema,
// } from "@afenda/contracts";
// import { createEntity, listEntities } from "@afenda/core";
// import { requireAuth, requireOrg, makeSuccessSchema } from "../../../helpers/responses.js";

/**
 * <Entity> routes — REST endpoints for <entity> entity.
 * 
 * Register in apps/api/src/index.ts:
 *   import { <entity>Routes } from "./routes/<pillar>/<module>/<entity>.js";
 *   await app.register(<entity>Routes, { prefix: "/v1" });
 */
export async function <entity>Routes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ── Command: Create ──────────────────────────────────────────────────────
  typedApp.post("/v1/commands/create-<entity>", {
//     config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
//     schema: {
//       description: "Create a new entity",
//       tags: ["entity"],
//       security: [{ bearerAuth: [] }],
//       body: CreateEntityCommandSchema,
//       response: {
//         201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
//       },
//     },
//     handler: async (req, reply) => {
//       const ctx = requireAuth(req);
//       const orgId = requireOrg(req);
//
//       // const result = await createEntity(app.db, ctx, ..., req.body);
//       // if (!result.ok) return reply.code(422).send({ error: result.error });
//       // return reply.code(201).send({ data: result.value, correlationId: req.correlationId });
//     },
//   });
//
//   // ── Query: List ────────────────────────────────────────────────────────
//   typedApp.get("/v1/entities", {
//     schema: {
//       description: "List entities (cursor-paginated)",
//       tags: ["entity"],
//       security: [{ bearerAuth: [] }],
//       querystring: CursorParamsSchema,
//     },
//     handler: async (req, reply) => {
//       const ctx = requireAuth(req);
//       const orgId = requireOrg(req);
//
//       // const page = await listEntities(app.db, { orgId, ...req.query });
//       // return reply.send({ ...page, correlationId: req.correlationId });
//     },
//   });
// }

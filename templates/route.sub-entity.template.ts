/**
 * TEMPLATE: Fastify route for apps/api with sub-entity pattern.
 *
 * Use this for: supplier sites, supplier bank accounts, invoice lines, etc.
 * Copy to: apps/api/src/routes/<pillar>/<module>/<sub-entity>.ts
 * Find-replace: EntityName/entityKey/entity-key with your domain name.
 *
 * RULES:
 *   1. Use ZodTypeProvider for schema → schema.body, schema.response.
 *   2. OpenAPI tags, descriptions, and security are required.
 *   3. Commands: rate-limit 30/min, require auth, require org.
 *   4. Queries: use cursor pagination schemas from contracts.
 *   5. Never import @afenda/db — use @afenda/core services.
 *   6. Use shared context helpers from helpers/context.ts (not local helpers).
 *   7. Register this route in apps/api/src/index.ts.
 *
 * Example parent entities: supplier → supplier-site, invoice → invoice-line
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateEntityCommandSchema,
  UpdateEntityCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
} from "@afenda/contracts";
import { createEntity, updateEntity, listEntities, getEntityById } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../helpers/context.js";

/**
 * EntityName routes — REST endpoints for entity-key entity.
 *
 * Register in apps/api/src/index.ts:
 *   import { entityNameRoutes } from "./routes/<pillar>/<module>/entity-key.js";
 *   await app.register(entityNameRoutes, { prefix: "/v1" });
 */
export async function entityNameRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ── Command: Create ────────────────────────────────────────────────────────
  typedApp.post(
    "/commands/create-entity-key",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a new entity-key",
        tags: ["EntityName"],
        security: [{ bearerAuth: [] }],
        body: CreateEntityCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await createEntity(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.code(422).send({
          error: { code: result.error, message: "Command failed" },
          correlationId: req.correlationId,
        });
      }

      return reply.code(201).send({
        data: { id: result.value.id },
        correlationId: req.correlationId,
      });
    },
  );

  // ── Query: List ──────────────────────────────────────────────────────────
  typedApp.get(
    "/entity-keys",
    {
      schema: {
        description: "List entity-keys with cursor pagination",
        tags: ["EntityName"],
        security: [{ bearerAuth: [] }],
        querystring: CursorParamsSchema,
        response: {
          200: makeSuccessSchema(z.array(z.object({ id: z.string().uuid() }))),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listEntities(app.db, buildOrgScopedContext(orgId), req.query);

      return reply.send({
        data: page.data,
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      });
    },
  );

  // ── Query: Get by ID ───────────────────────────────────────────────────────
  typedApp.get(
    "/entity-keys/:id",
    {
      schema: {
        description: "Get entity-key by ID",
        tags: ["EntityName"],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await getEntityById(app.db, buildOrgScopedContext(orgId), req.params.id);

      if (!result) {
        return reply.code(404).send({
          error: { code: "ENTITY_NOT_FOUND", message: "Entity not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.send({
        data: result,
        correlationId: req.correlationId,
      });
    },
  );
}

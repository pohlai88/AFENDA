/**
 * IAM routes — identity, context switching, principal info.
 *
 * ADR-0003: Party + Principal model API endpoints.
 *
 * Routes:
 *   GET /v1/me           → current principal info + active context
 *   GET /v1/me/contexts  → list available contexts (hats) for context switching
 */

import type { FastifyInstance } from "fastify";
import { listPrincipalContexts } from "@afenda/core";

export async function iamRoutes(app: FastifyInstance) {
  // ── Current principal info ─────────────────────────────────────────────────
  /**
   * GET /v1/me
   *
   * Returns the current authenticated principal's info and active context.
   * Requires authentication.
   */
  app.get("/me", async (req, reply) => {
    if (!req.ctx) {
      return reply.status(401).send({
        error: { code: "unauthorized", message: "Authentication required" },
        correlationId: req.correlationId,
      });
    }

    return {
      data: {
        principalId: req.ctx.principalId,
        activeContext: req.ctx.activeContext ?? null,
        roles: req.ctx.roles,
        permissions: req.ctx.permissions,
      },
      correlationId: req.correlationId,
    };
  });

  // ── List available contexts (hats) for context switching ───────────────────
  /**
   * GET /v1/me/contexts
   *
   * Returns all contexts (partyRole memberships) available to the authenticated
   * principal. Used by the UI for context switching dropdown.
   *
   * ADR-0003: Each context represents a "hat" — a party role in an organization.
   *
   * Response:
   *   {
   *     contexts: [
   *       { partyRoleId, orgId, orgName, roleType, partyName },
   *       ...
   *     ]
   *   }
   */
  app.get("/me/contexts", async (req, reply) => {
    if (!req.ctx) {
      return reply.status(401).send({
        error: { code: "unauthorized", message: "Authentication required" },
        correlationId: req.correlationId,
      });
    }

    const contexts = await listPrincipalContexts(app.db, req.ctx.principalId);

    // Map to contract schema shape (add partyName placeholder for now)
    const contextItems = contexts.map((ctx) => ({
      partyRoleId: ctx.partyRoleId,
      orgId: ctx.orgId,
      orgName: ctx.orgName,
      roleType: ctx.roleType,
      partyName: ctx.orgName, // TODO: resolve party name separately
    }));

    return {
      data: { contexts: contextItems },
      correlationId: req.correlationId,
    };
  });
}

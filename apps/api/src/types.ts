/**
 * Fastify type augmentations for AFENDA API.
 *
 * Centralises all `declare module "fastify"` extensions so that
 * every route and plugin sees consistent types.
 *
 * ADR-0003: Uses organization/principal model exclusively.
 */

import type { RequestContext } from "@afenda/contracts";
import type { DbClient } from "@afenda/core";

declare module "fastify" {
  interface FastifyInstance {
    /** Drizzle ORM client — registered by plugins/db.ts */
    db: DbClient;
  }

  interface FastifyRequest {
    /** UUID correlation id — set by onRequest hook */
    correlationId: string;

    /** Organization slug from subdomain / header / fallback */
    orgSlug: string;
    /** Resolved organization UUID — set after DB lookup */
    orgId?: string;

    /** Authenticated principal context — set by auth plugin (undefined = anonymous) */
    ctx?: RequestContext;
  }
}

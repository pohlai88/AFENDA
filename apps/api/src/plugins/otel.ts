/**
 * OTel request enrichment plugin.
 *
 * Auto-extracts domain context from Fastify request properties and stamps
 * it on the active HTTP span.  Uses duck-typed `extractRequestAttrs()` —
 * no hardcoded attribute list.  Adding a new decorated property to the
 * request (e.g. `req.teamId`) will be picked up automatically once the
 * extractor recognises the shape.
 *
 * Searchable Jaeger attributes (auto-derived):
 *   - afenda.org.id       → find all traces for an org
 *   - afenda.org.slug     → find traces by subdomain
 *   - afenda.principal.id → find all traces for a user
 *   - afenda.correlation.id → correlate API ↔ frontend requests
 *
 * Must be registered AFTER authPlugin (so req.ctx is populated).
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { extractRequestAttrs, setActiveSpanAttributes, updateActiveSpanName } from "@afenda/core";

async function otelPlugin(app: FastifyInstance) {
  // ── onRequest: stamp domain context attrs on the HTTP span ───────────────
  // Runs after auth so req.ctx / req.orgId are already populated.
  app.addHook("onRequest", async (req) => {
    const attrs = extractRequestAttrs(req as unknown as Record<string, unknown>);
    if (Object.keys(attrs).length > 0) {
      setActiveSpanAttributes(attrs);
    }
  });

  // ── onSend: update span name to include the matched route template ────────
  // The HTTP auto-instrumentation names spans with just the HTTP method ("GET").
  // After Fastify has matched the route, routeOptions.url gives the template
  // (e.g. "/v1/invoices/:invoiceId") so Jaeger shows meaningful operation names.
  app.addHook("onSend", async (req) => {
    const routeTemplate =
      (req as unknown as { routeOptions?: { url?: string } }).routeOptions?.url;
    if (routeTemplate) {
      updateActiveSpanName(`${req.method} ${routeTemplate}`);
    }
  });

  app.log.debug("OTel request enrichment plugin registered");
}

export const otelEnrichmentPlugin = fp(otelPlugin, {
  name: "otel-enrichment",
  // No `dependencies` — registration order in index.ts guarantees
  // auth runs before this.  Fastify dependency names are fragile
  // (auto-derived from function name) so we avoid coupling to them.
});

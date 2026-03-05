/**
 * Fastify plugin: Idempotency guard.
 *
 * Reads the idempotency key from:
 *   1. `Idempotency-Key` header  (API-level convention)
 *   2. `body.idempotencyKey`     (contract-level convention)
 *
 * Flow:
 *   1. preHandler: `beginIdempotency()` claims the key.
 *        → new         → allow handler to run
 *        → duplicate   → replay cached response (status + body)
 *        → in_progress → 409 (another request is still executing)
 *        → mismatch    → 409 (key reused with different payload)
 *   2. onSend: `markDoneIdempotency()` stores result for successful requests.
 *   3. onError: `releaseIdempotency()` deletes the pending row so retries work.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { IdempotencyKeyHeader, type OrgId, type IdempotencyKey } from "@afenda/contracts";
import {
  beginIdempotency,
  markDoneIdempotency,
  releaseIdempotency,
  hashRequest,
  IDEMPOTENCY_TTL_MS,
  IDEMPOTENCY_TTL_FINANCE_MS,
} from "@afenda/core";
import type { BeginIdempotencyParams } from "@afenda/core";

/** Finance-related command prefixes that get a longer TTL. */
const FINANCE_COMMAND_PREFIXES = ["POST:/v1/invoices", "POST:/v1/journal-entries", "POST:/v1/payments"];

function ttlForCommand(command: string): number {
  return FINANCE_COMMAND_PREFIXES.some((p) => command.startsWith(p))
    ? IDEMPOTENCY_TTL_FINANCE_MS
    : IDEMPOTENCY_TTL_MS;
}

interface IdempotencyMeta {
  orgId: OrgId;
  command: string;
  key: IdempotencyKey;
  requestHash: string;
}

export const idempotencyPlugin = fp(async function idempotencyPlugin(app: FastifyInstance) {
  // ── preHandler: claim idempotency key ──────────────────────────────────────
  app.addHook("preHandler", async (req, reply) => {
    const key =
      (req.headers[IdempotencyKeyHeader] as string | undefined) ??
      (req.body as Record<string, unknown> | null)?.["idempotencyKey"] as
        | string
        | undefined;

    if (!key) return; // not an idempotent request

    const orgId = req.orgId;
    if (!orgId) return; // org not resolved yet

    const command = `${req.method}:${req.routeOptions.url ?? req.url}`;
    const requestHash = hashRequest(req.body);

    const meta: IdempotencyMeta = {
      orgId: orgId as OrgId,
      command,
      key: key as IdempotencyKey,
      requestHash,
    };

    const result = await beginIdempotency(app.db, {
      ...meta,
      ttlMs: ttlForCommand(command),
    });

    switch (result.status) {
      case "mismatch":
        return reply.status(409).send({
          error: {
            code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
            message:
              "Idempotency key was previously used with different request parameters",
          },
          correlationId: req.correlationId,
        });

      case "in_progress":
        return reply
          .status(409)
          .header("Retry-After", "2")
          .send({
            error: {
              code: "IDEMPOTENCY_KEY_IN_PROGRESS",
              message:
                "A request with this idempotency key is already being processed",
            },
            correlationId: req.correlationId,
          });

      case "duplicate": {
        const cached = result.cachedResult;
        const statusCode = cached.statusCode ?? 200;
        if (cached.headers) {
          for (const [k, v] of Object.entries(cached.headers)) {
            reply.header(k, v);
          }
        }
        if (cached.body) {
          return reply.status(statusCode).send(JSON.parse(cached.body));
        }
        return reply.status(statusCode).send({
          data: null,
          correlationId: req.correlationId,
        });
      }

      case "new":
        // Mark for post-response storage
        (req as any).__idempotency = meta;
        return;
    }
  });

  // ── onSend: store result for successful requests ───────────────────────────
  app.addHook("onSend", async (req, reply, payload) => {
    const meta = (req as any).__idempotency as IdempotencyMeta | undefined;

    if (!meta || reply.statusCode >= 400) return payload;

    try {
      await markDoneIdempotency(app.db, {
        orgId: meta.orgId,
        command: meta.command,
        key: meta.key,
        requestHash: meta.requestHash,
        resultRef:
          typeof payload === "string" ? payload : JSON.stringify(payload),
        responseStatus: reply.statusCode,
      });
    } catch (err) {
      app.log.warn({ err }, "Failed to store idempotency result (non-fatal)");
    }

    return payload;
  });

  // ── onError: release pending key so client can retry ───────────────────────
  app.addHook("onError", async (req) => {
    const meta = (req as any).__idempotency as IdempotencyMeta | undefined;

    if (!meta) return;

    try {
      await releaseIdempotency(app.db, {
        orgId: meta.orgId,
        command: meta.command,
        key: meta.key,
        requestHash: meta.requestHash,
      });
    } catch (err) {
      app.log.warn({ err }, "Failed to release idempotency key (non-fatal)");
    }
  });
});

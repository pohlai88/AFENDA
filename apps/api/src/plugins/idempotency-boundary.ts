import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  SharedIdempotencyKeySchema,
  InMemoryIdempotencyStore,
  PostgresIdempotencyStore,
  ensureIdempotencyWithFailureState,
  type ConventionsIdempotencyStore,
  type ConventionsSqlClient,
} from "@afenda/contracts";

type IdempotencyBoundaryOptions = {
  store?: ConventionsIdempotencyStore;
  client?: ConventionsSqlClient;
  table?: string;
  headerName?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    idempotencyStore?: ConventionsIdempotencyStore;
    idempotencyKey?: string;
    ensureIdempotency?: <T>(
      handler: () => Promise<T>,
      opts?: { ttlSeconds?: number },
    ) => Promise<T>;
  }
}

function pickStore(opts: IdempotencyBoundaryOptions): ConventionsIdempotencyStore {
  if (opts.store) return opts.store;
  if (opts.client) {
    return new PostgresIdempotencyStore(opts.client, opts.table ?? "idempotency");
  }
  return new InMemoryIdempotencyStore();
}

const idempotencyBoundaryPluginImpl: FastifyPluginAsync<IdempotencyBoundaryOptions> = async (
  app,
  opts,
) => {
  const headerName = (opts.headerName ?? "x-idempotency-key").toLowerCase();
  const store = pickStore(opts);

  app.addHook("preHandler", async (req, reply) => {
    req.idempotencyStore = store;

    const body = req.body as Record<string, unknown> | undefined;
    const query = req.query as Record<string, unknown> | undefined;

    const fromHeader = req.headers[headerName];
    const raw =
      (typeof fromHeader === "string" ? fromHeader : undefined) ??
      (typeof body?.idempotencyKey === "string" ? body.idempotencyKey : undefined) ??
      (typeof query?.idempotencyKey === "string" ? query.idempotencyKey : undefined);

    if (raw) {
      const parsed = SharedIdempotencyKeySchema.safeParse(raw);
      if (!parsed.success) {
        await reply.status(400).send({
          error: {
            code: "SHARED_VALIDATION_ERROR",
            message: "invalid idempotency key",
          },
          correlationId: req.correlationId,
        });
        return;
      }
      req.idempotencyKey = parsed.data;
    }

    req.ensureIdempotency = async <T>(
      handler: () => Promise<T>,
      ensureOpts?: { ttlSeconds?: number },
    ) => {
      if (!req.idempotencyStore || !req.idempotencyKey) {
        return handler();
      }
      return ensureIdempotencyWithFailureState(req.idempotencyStore, req.idempotencyKey, handler, {
        ttlSeconds: ensureOpts?.ttlSeconds,
      });
    };
  });
};

export const idempotencyBoundaryPlugin = fp(idempotencyBoundaryPluginImpl as any, {
  name: "idempotency-boundary-plugin",
}) as FastifyPluginAsync<IdempotencyBoundaryOptions>;

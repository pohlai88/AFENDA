import { CorrelationIdHeader, OrgIdHeader } from "./headers.js";
import { type Clock, SystemClock } from "./clock.js";

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child?(fields: Record<string, unknown>): Logger;
}

export type FeatureContext = {
  principalId?: string;
  orgId?: string;
  env?: string;
};

export interface FeatureClient {
  isEnabled(flag: string, ctx?: FeatureContext): Promise<boolean>;
  getVariant?(flag: string, ctx?: FeatureContext): Promise<string | null>;
}

export interface SecretsProvider {
  getSecret(key: string): Promise<string | undefined>;
  getSecretJson<T = unknown>(key: string): Promise<T | undefined>;
}

export type RequestContext = {
  clock: Clock;
  logger: Logger;
  correlationId?: string;
  orgId?: string;
  principalId?: string;
  featureClient: FeatureClient;
  secretsProvider: SecretsProvider;
  bag?: Record<string, unknown>;
};

export const NoopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => NoopLogger,
};

export const NoopFeatureClient: FeatureClient = {
  async isEnabled(): Promise<boolean> {
    return false;
  },
  async getVariant(): Promise<string | null> {
    return null;
  },
};

export const NoopSecretsProvider: SecretsProvider = {
  async getSecret(): Promise<string | undefined> {
    return undefined;
  },
  async getSecretJson<T = unknown>(): Promise<T | undefined> {
    return undefined;
  },
};

type ContextStorage<T> = {
  run<R>(value: T, fn: () => Promise<R> | R): Promise<R>;
  getStore(): T | undefined;
};

function createInMemoryContextStorage<T>(): ContextStorage<T> {
  const stack: T[] = [];

  return {
    async run<R>(value: T, fn: () => Promise<R> | R): Promise<R> {
      stack.push(value);
      try {
        return await fn();
      } finally {
        stack.pop();
      }
    },
    getStore(): T | undefined {
      return stack[stack.length - 1];
    },
  };
}

let storage: ContextStorage<RequestContext> = createInMemoryContextStorage<RequestContext>();

/**
 * Allows runtime packages (api/core/worker) to provide async-safe context storage.
 * Contracts defaults to an in-memory implementation to remain runtime-agnostic.
 */
export function configureRequestContextStorage(nextStorage: ContextStorage<RequestContext>): void {
  storage = nextStorage;
}

export function createRequestContext(opts?: Partial<RequestContext>): RequestContext {
  return {
    clock: opts?.clock ?? SystemClock,
    logger: opts?.logger ?? NoopLogger,
    correlationId: opts?.correlationId,
    orgId: opts?.orgId,
    principalId: opts?.principalId,
    featureClient: opts?.featureClient ?? NoopFeatureClient,
    secretsProvider: opts?.secretsProvider ?? NoopSecretsProvider,
    bag: opts?.bag ?? {},
  };
}

export async function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T,
): Promise<T> {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "RequestContext not available. Ensure attachContextMiddleware or runWithRequestContext was used.",
    );
  }
  return ctx;
}

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  path?: string;
  context?: RequestContext;
};

type ResponseLike = {
  statusCode?: number;
  on(event: "finish", listener: () => void): void;
};

type NextLike = (error?: unknown) => void;

export type ContextMiddleware = (req: RequestLike, res: ResponseLike, next: NextLike) => void;

function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export function attachContextMiddleware(opts?: {
  headerNames?: { correlationId?: string; orgId?: string; principalId?: string };
  baseLogger?: Logger;
  makeLogger?: (base: Logger, fields: Record<string, unknown>) => Logger;
}): ContextMiddleware {
  const headerNames = {
    correlationId: opts?.headerNames?.correlationId ?? CorrelationIdHeader,
    orgId: opts?.headerNames?.orgId ?? OrgIdHeader,
    principalId: opts?.headerNames?.principalId ?? "x-principal-id",
  };

  const baseLogger = opts?.baseLogger ?? NoopLogger;
  const makeLogger =
    opts?.makeLogger ??
    ((base: Logger, fields: Record<string, unknown>) => (base.child ? base.child(fields) : base));

  return (req, res, next) => {
    try {
      const correlationId = headerValue(req.headers[headerNames.correlationId]);
      const orgId = headerValue(req.headers[headerNames.orgId]);
      const principalId = headerValue(req.headers[headerNames.principalId]);

      const logger = makeLogger(baseLogger, {
        correlationId,
        orgId,
        principalId,
        path: req.path,
        method: req.method,
      });

      const ctx = createRequestContext({
        clock: SystemClock,
        logger,
        correlationId,
        orgId,
        principalId,
      });

      void storage.run(ctx, () => {
        req.context = ctx;
        res.on("finish", () => {
          try {
            ctx.logger.info("request.finished", { status: res.statusCode ?? 0 });
          } catch {
            // Ignore logger failures in lifecycle hooks.
          }
        });
        next();
      });
    } catch (error) {
      next(error);
    }
  };
}

export function ctxLogger(): Logger {
  return getRequestContext().logger;
}

export function ctxClock(): Clock {
  return getRequestContext().clock;
}

export function ctxCorrelationId(): string | undefined {
  return getRequestContext().correlationId;
}

export const SharedRequestContext = {
  configureRequestContextStorage,
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  attachContextMiddleware,
  ctxLogger,
  ctxClock,
  ctxCorrelationId,
  NoopLogger,
  NoopFeatureClient,
  NoopSecretsProvider,
};

export default SharedRequestContext;

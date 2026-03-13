import { describe, expect, it, vi } from "vitest";

import { FixedClock } from "../clock";
import {
  NoopLogger,
  attachContextMiddleware,
  createRequestContext,
  ctxCorrelationId,
  getRequestContext,
  runWithRequestContext,
} from "../request-context";

describe("shared request context", () => {
  it("creates context with defaults", async () => {
    const ctx = createRequestContext();

    expect(ctx.logger).toBe(NoopLogger);
    expect(await ctx.featureClient.isEnabled("flag")).toBe(false);
    expect(await ctx.secretsProvider.getSecret("x")).toBeUndefined();
  });

  it("binds context across await boundaries", async () => {
    const fixed = new FixedClock("2026-01-01T00:00:00.000Z");
    const ctx = createRequestContext({
      clock: fixed,
      logger: NoopLogger,
      correlationId: "corr-1",
      orgId: "org-1",
      principalId: "principal-1",
    });

    await runWithRequestContext(ctx, async () => {
      await Promise.resolve();
      const current = getRequestContext();
      expect(current.clock.nowIso()).toBe("2026-01-01T00:00:00.000Z");
      expect(current.orgId).toBe("org-1");
      expect(ctxCorrelationId()).toBe("corr-1");
    });
  });

  it("throws when context is unavailable", () => {
    expect(() => getRequestContext()).toThrow(/RequestContext not available/i);
  });

  it("middleware extracts headers and attaches req.context", async () => {
    const baseLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnValue(NoopLogger),
    };

    const middleware = attachContextMiddleware({ baseLogger });

    let finishHandler: (() => void) | undefined;
    const req: {
      headers: Record<string, string>;
      method: string;
      path: string;
      context?: ReturnType<typeof createRequestContext>;
    } = {
      headers: {
        "x-correlation-id": "corr-2",
        "x-org-id": "org-2",
        "x-principal-id": "principal-2",
      },
      method: "GET",
      path: "/health",
    };

    const res = {
      statusCode: 200,
      on: vi.fn((event: "finish", listener: () => void) => {
        if (event === "finish") {
          finishHandler = listener;
        }
      }),
    };

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.context?.correlationId).toBe("corr-2");
    expect(req.context?.orgId).toBe("org-2");
    expect(req.context?.principalId).toBe("principal-2");
    expect(baseLogger.child).toHaveBeenCalled();

    if (!finishHandler) {
      throw new Error("finish handler was not registered");
    }
    finishHandler();
  });
});

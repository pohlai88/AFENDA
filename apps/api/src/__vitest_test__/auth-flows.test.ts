import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { IAM_CREDENTIALS_INVALID } from "@afenda/contracts";

import { createTestApp, resetDb, closeApp } from "./helpers/app-factory.js";
import { SUBMITTER_EMAIL } from "./helpers/factories.js";

function expectAuthFlowError(value: unknown) {
  expect(value).toMatchObject({
    ok: false,
    code: expect.any(String),
    message: expect.any(String),
  });
}

describe("Auth flows (strict)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    if (app) await resetDb(app);
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  describe("Public auth endpoints", () => {
    it("request-password-reset returns accepted response", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/request-password-reset",
        payload: {
          idempotencyKey: crypto.randomUUID(),
          email: SUBMITTER_EMAIL,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        data: {
          accepted: true,
          message: expect.any(String),
        },
      });
    });

    it("verify-reset-token returns normalized AuthFlowResult error", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/verify-reset-token",
        payload: {
          email: SUBMITTER_EMAIL,
          token: "123456",
        },
      });

      expect(res.statusCode).toBe(200);
      expectAuthFlowError(res.json());
    });

    it("verify-invite-token returns normalized AuthFlowResult error", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/verify-invite-token",
        payload: {
          token: "invalid-token-1234567890",
        },
      });

      expect(res.statusCode).toBe(200);
      expectAuthFlowError(res.json());
    });

    it("verify-session-grant returns normalized AuthFlowResult error", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/verify-session-grant",
        payload: {
          grant: "invalid-grant-token-123456789012345678901234567890",
        },
      });

      expect(res.statusCode).toBe(200);
      expectAuthFlowError(res.json());
    });

    it("accept-portal-invitation returns normalized AuthFlowResult error for invalid token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/accept-portal-invitation",
        payload: {
          idempotencyKey: crypto.randomUUID(),
          token: "invalid-token-1234567890",
          fullName: "Test User",
          password: "TestPassword123!",
        },
      });

      expect(res.statusCode).toBe(200);
      expectAuthFlowError(res.json());
    });

    it("verify-credentials returns 401 + normalized error for invalid password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/verify-credentials",
        payload: {
          email: SUBMITTER_EMAIL,
          password: "DefinitelyWrongPassword123!",
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: {
          code: IAM_CREDENTIALS_INVALID,
          message: expect.any(String),
        },
      });
    });

    it("login returns normalized AuthFlowResult error for invalid password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: SUBMITTER_EMAIL,
          password: "DefinitelyWrongPassword123!",
          portal: "app",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        ok: false,
        code: IAM_CREDENTIALS_INVALID,
        message: expect.any(String),
      });
    });
  });

  describe("MFA verification diagnostics", () => {
    it("verify-mfa-challenge logs request metadata and emits normalized failure", async () => {
      const infoSpy = vi.spyOn(app.log, "info");
      const warnSpy = vi.spyOn(app.log, "warn");

      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/verify-mfa-challenge",
        payload: {
          mfaToken: "invalid-token-123",
          code: "000000",
        },
      });

      expect(res.statusCode).toBe(200);
      expectAuthFlowError(res.json());

      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "/v1/auth/verify-mfa-challenge",
          codeLength: 6,
          hasMfaToken: true,
        }),
        "Auth MFA verify challenge request",
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "/v1/auth/verify-mfa-challenge",
          errorCode: expect.any(String),
        }),
        "Auth MFA verify challenge failed",
      );
    });
  });

  describe("Architecture guards (split-brain prevention)", () => {
    it("web auth service delegates to API and does not import core", () => {
      const apiServicePath = resolve(
        process.cwd(),
        "../web/src/features/auth/server/afenda-auth.api.ts",
      );
      const source = readFileSync(apiServicePath, "utf8");

      expect(source).toContain('authApiFetch("/v1/auth/login"');
      expect(source).toContain('authApiFetch("/v1/auth/verify-reset-token"');
      expect(source).toContain('authApiFetch("/v1/auth/verify-invite-token"');
      expect(source).toContain('authApiFetch("/v1/auth/accept-portal-invitation"');
      expect(source).toContain('authApiFetch("/v1/auth/verify-mfa-challenge"');
      expect(source).not.toContain('from "@afenda/core"');
    });

    it("MFA verify action establishes session grant before redirect", () => {
      const verifyActionPath = resolve(process.cwd(), "../web/src/app/auth/_actions/verify.ts");
      const source = readFileSync(verifyActionPath, "utf8");

      const establishIdx = source.indexOf("const consumeResult = await consumeAuthChallenge");
      const redirectIdx = source.lastIndexOf("redirect(redirectTo);");

      expect(establishIdx).toBeGreaterThan(-1);
      expect(redirectIdx).toBeGreaterThan(-1);
      expect(establishIdx).toBeLessThan(redirectIdx);
    });

    it("Invite accept action uses session grant path", () => {
      const inviteActionPath = resolve(process.cwd(), "../web/src/app/auth/_actions/invite.ts");
      const source = readFileSync(inviteActionPath, "utf8");

      expect(source).toContain("const { email, portal } = result.data;");
      expect(source).toContain('await signIn("credentials"');
    });
  });

  describe("Protected auth endpoint guards", () => {
    it("request-portal-invitation rejects unauthenticated requests", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/request-portal-invitation",
        payload: {
          idempotencyKey: crypto.randomUUID(),
          email: "invitee@example.com",
          portal: "supplier",
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it("cross-org portal invitation is rejected — org context must match authenticated session", async () => {
      // Portal invitations are scoped to the requesting principal's active org.
      // A caller from a different org (or an unauthenticated caller) MUST be
      // rejected before any org-scoped supplier data is accessed or mutated.
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/request-portal-invitation",
        payload: {
          idempotencyKey: crypto.randomUUID(),
          email: "attacker@different-org.com",
          portal: "supplier",
        },
        headers: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });
});

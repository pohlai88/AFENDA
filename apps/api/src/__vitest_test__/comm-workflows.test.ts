/**
 * Integration tests — comm workflow routes: permission enforcement.
 *
 * Covers the 403 hard-guard layer added to every workflow endpoint.
 * Neither ADMIN_EMAIL nor APPROVER_EMAIL holds any comm.task.* permission,
 * so they are the natural "unpermissioned" callers for these tests.
 *
 * Tested endpoints:
 *   POST /v1/commands/create-workflow         → requires comm.task.create
 *   POST /v1/commands/update-workflow         → requires comm.task.update
 *   POST /v1/commands/change-workflow-status  → requires comm.task.update
 *   POST /v1/commands/delete-workflow         → requires comm.task.update
 *   POST /v1/commands/execute-workflow        → requires comm.task.complete
 *   GET  /v1/workflows                        → requires comm.task.read | update | create
 *   GET  /v1/workflows/:id                    → requires comm.task.read | update | create
 *   GET  /v1/workflows/:id/runs               → requires comm.task.read | update | create
 *   GET  /v1/workflow-runs/:runId             → requires comm.task.read | update | create
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, injectAs, closeApp } from "./helpers/app-factory.js";
import { ADMIN_EMAIL, uniqueKey } from "./helpers/factories.js";

// Stable dummy UUID for path/body params — no DB row is created; the
// permission check fires before any DB call so the UUID need not exist.
const DUMMY_UUID = "00000000-0000-4000-8000-000000000001";

describe("comm workflow routes — 403 permission enforcement", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  // ── Query routes ───────────────────────────────────────────────────────────

  it("GET /v1/workflows returns 403 when caller lacks comm.task.* permission", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "GET",
      url: "/v1/workflows",
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("GET /v1/workflows/:id returns 403 when caller lacks comm.task.* permission", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "GET",
      url: `/v1/workflows/${DUMMY_UUID}`,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("GET /v1/workflows/:id/runs returns 403 when caller lacks comm.task.* permission", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "GET",
      url: `/v1/workflows/${DUMMY_UUID}/runs`,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("GET /v1/workflow-runs/:runId returns 403 when caller lacks comm.task.* permission", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "GET",
      url: `/v1/workflow-runs/${DUMMY_UUID}`,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  // ── Command routes ─────────────────────────────────────────────────────────

  it("POST /v1/commands/create-workflow returns 403 when caller lacks comm.task.create", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-workflow",
      payload: {
        idempotencyKey: uniqueKey("wf-create"),
        name: "Test Workflow",
        trigger: { type: "task.created" },
        actions: [{ type: "send_notification", config: {} }],
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("POST /v1/commands/update-workflow returns 403 when caller lacks comm.task.update", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "POST",
      url: "/v1/commands/update-workflow",
      payload: {
        idempotencyKey: uniqueKey("wf-update"),
        workflowId: DUMMY_UUID,
        name: "Renamed Workflow",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("POST /v1/commands/change-workflow-status returns 403 when caller lacks comm.task.update", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "POST",
      url: "/v1/commands/change-workflow-status",
      payload: {
        idempotencyKey: uniqueKey("wf-status"),
        workflowId: DUMMY_UUID,
        status: "paused",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("POST /v1/commands/delete-workflow returns 403 when caller lacks comm.task.update", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "POST",
      url: "/v1/commands/delete-workflow",
      payload: {
        idempotencyKey: uniqueKey("wf-delete"),
        workflowId: DUMMY_UUID,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });

  it("POST /v1/commands/execute-workflow returns 403 when caller lacks comm.task.complete", async () => {
    const res = await injectAs(app, ADMIN_EMAIL, {
      method: "POST",
      url: "/v1/commands/execute-workflow",
      payload: {
        idempotencyKey: uniqueKey("wf-execute"),
        workflowId: DUMMY_UUID,
        triggerPayload: {},
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SHARED_FORBIDDEN");
  });
});

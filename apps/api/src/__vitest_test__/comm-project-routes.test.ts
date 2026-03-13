import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeApp, createTestApp, injectAs, resetDb } from "./helpers/app-factory.js";
import { APPROVER_EMAIL, SUBMITTER_EMAIL, uniqueKey } from "./helpers/factories.js";

async function lookupPrincipalId(app: FastifyInstance, email: string): Promise<string> {
  const result = await app.db.execute(/* sql */ `
    SELECT id
    FROM iam_principal
    WHERE email = '${email}'
    LIMIT 1
  `);

  const row = (result as unknown as { rows: Array<{ id: string }> }).rows[0];
  if (!row) {
    throw new Error(`Principal not found for ${email}`);
  }

  return row.id;
}

async function createProject(
  app: FastifyInstance,
  name = `Project ${Date.now()}`,
): Promise<string> {
  const response = await injectAs(app, SUBMITTER_EMAIL, {
    method: "POST",
    url: "/v1/commands/create-project",
    payload: {
      idempotencyKey: uniqueKey("project"),
      name,
      description: "Communication module rollout",
      visibility: "team",
      startDate: "2026-03-12",
      targetDate: "2026-03-31",
      color: "#0F766E",
    },
  });

  expect(response.statusCode).toBe(201);
  return response.json().data.id as string;
}

describe("comm project routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  it("creates, lists, and fetches projects", async () => {
    const projectId = await createProject(app, "Boardroom Launch");

    const listRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: "/v1/projects?status=planning&limit=10",
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data).toHaveLength(1);
    expect(listRes.json().data[0]).toMatchObject({
      id: projectId,
      name: "Boardroom Launch",
      status: "planning",
      visibility: "team",
    });

    const getRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/projects/${projectId}`,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().data).toMatchObject({
      id: projectId,
      name: "Boardroom Launch",
      status: "planning",
    });

    const auditResult = await app.db.execute(/* sql */ `
      SELECT action, entity_type, entity_id
      FROM audit_log
      WHERE entity_type = 'project'
      ORDER BY occurred_at ASC
    `);

    const auditRows = (
      auditResult as unknown as {
        rows: Array<{ action: string; entity_type: string; entity_id: string }>;
      }
    ).rows;

    expect(auditRows).toEqual([
      {
        action: "project.created",
        entity_type: "project",
        entity_id: projectId,
      },
    ]);
  });

  it("maps invalid transitions to 400 and missing projects to 404", async () => {
    const projectId = await createProject(app, "Timeline Migration");

    const invalidTransitionRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/transition-project-status",
      payload: {
        idempotencyKey: uniqueKey("project-transition"),
        projectId,
        toStatus: "completed",
      },
    });

    expect(invalidTransitionRes.statusCode).toBe(400);
    expect(invalidTransitionRes.json()).toMatchObject({
      error: {
        code: "COMM_PROJECT_INVALID_STATUS_TRANSITION",
      },
    });

    const missingProjectId = crypto.randomUUID();
    const updateMissingRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/update-project",
      payload: {
        idempotencyKey: uniqueKey("project-update"),
        projectId: missingProjectId,
        name: "Should Fail",
      },
    });

    expect(updateMissingRes.statusCode).toBe(404);
    expect(updateMissingRes.json()).toMatchObject({
      error: {
        code: "COMM_PROJECT_NOT_FOUND",
        details: {
          projectId: missingProjectId,
        },
      },
    });
  });

  it("adds members and maps duplicates to 409", async () => {
    const projectId = await createProject(app, "Inbox Launch");
    const approverPrincipalId = await lookupPrincipalId(app, APPROVER_EMAIL);

    const firstAddRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/add-project-member",
      payload: {
        idempotencyKey: uniqueKey("project-member"),
        projectId,
        principalId: approverPrincipalId,
        role: "editor",
      },
    });

    expect(firstAddRes.statusCode).toBe(200);
    expect(firstAddRes.json().data).toMatchObject({
      id: projectId,
      principalId: approverPrincipalId,
    });

    const duplicateAddRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/add-project-member",
      payload: {
        idempotencyKey: uniqueKey("project-member"),
        projectId,
        principalId: approverPrincipalId,
        role: "editor",
      },
    });

    expect(duplicateAddRes.statusCode).toBe(409);
    expect(duplicateAddRes.json()).toMatchObject({
      error: {
        code: "COMM_PROJECT_MEMBER_ALREADY_EXISTS",
      },
    });

    const membersRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/projects/${projectId}/members`,
    });

    expect(membersRes.statusCode).toBe(200);
    expect(membersRes.json().data).toHaveLength(1);
    expect(membersRes.json().data[0]).toMatchObject({
      projectId,
      principalId: approverPrincipalId,
      role: "editor",
    });
  });

  it("creates and completes milestones via HTTP", async () => {
    const projectId = await createProject(app, "Docs Migration");

    const createMilestoneRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/create-project-milestone",
      payload: {
        idempotencyKey: uniqueKey("project-milestone"),
        projectId,
        name: "Draft information architecture",
        description: "Align the docs hierarchy",
        targetDate: "2026-03-20",
      },
    });

    expect(createMilestoneRes.statusCode).toBe(201);
    const milestoneId = createMilestoneRes.json().data.id as string;

    const completeMilestoneRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/complete-project-milestone",
      payload: {
        idempotencyKey: uniqueKey("project-milestone-complete"),
        milestoneId,
      },
    });

    expect(completeMilestoneRes.statusCode).toBe(200);
    expect(completeMilestoneRes.json().data).toMatchObject({
      id: milestoneId,
      status: "completed",
    });

    const milestonesRes = await injectAs(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/projects/${projectId}/milestones`,
    });

    expect(milestonesRes.statusCode).toBe(200);
    expect(milestonesRes.json().data).toHaveLength(1);
    expect(milestonesRes.json().data[0]).toMatchObject({
      id: milestoneId,
      projectId,
      name: "Draft information architecture",
      status: "completed",
    });
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeApp, createTestApp, injectAs, resetDb } from "./helpers/app-factory.js";
import { SUBMITTER_EMAIL, APPROVER_EMAIL, uniqueKey } from "./helpers/factories.js";

async function injectAsWithCorrelation(
  app: FastifyInstance,
  email: string,
  opts: Parameters<typeof injectAs>[2],
) {
  return injectAs(app, email, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      "x-correlation-id": crypto.randomUUID(),
    },
  });
}

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

async function createMeeting(app: FastifyInstance): Promise<string> {
  const chairId = await lookupPrincipalId(app, SUBMITTER_EMAIL);
  const secretaryId = await lookupPrincipalId(app, APPROVER_EMAIL);

  const res = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
    method: "POST",
    url: "/v1/commands/comm-board-meetings/create",
    payload: {
      idempotencyKey: uniqueKey("meeting-create"),
      title: `Board Meeting ${Date.now()}`,
      description: "Quarterly governance review",
      duration: 90,
      location: "Main Conference Room",
      chairId,
      secretaryId,
      quorumRequired: 1,
    },
  });

  expect(res.statusCode).toBe(201);
  return res.json().data.id as string;
}

async function proposeResolution(app: FastifyInstance, meetingId: string): Promise<string> {
  const res = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
    method: "POST",
    url: "/v1/commands/comm-board-meetings/resolutions/propose",
    payload: {
      idempotencyKey: uniqueKey("resolution-propose"),
      meetingId,
      title: "Approve annual budget",
      description: "Approve FY budget for operations and growth",
    },
  });

  expect(res.statusCode).toBe(201);
  return res.json().data.id as string;
}

describe("comm boardroom resolution routes", () => {
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

  it("updates a proposed resolution via HTTP", async () => {
    const meetingId = await createMeeting(app);
    const resolutionId = await proposeResolution(app, meetingId);

    const updateRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/comm-board-meetings/resolutions/update",
      payload: {
        idempotencyKey: uniqueKey("resolution-update"),
        resolutionId,
        title: "Approve annual budget v2",
        description: "Updated budget scope after finance review",
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data).toMatchObject({ id: resolutionId });

    const listRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/comm-board-meetings/${meetingId}/resolutions`,
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data).toHaveLength(1);
    expect(listRes.json().data[0]).toMatchObject({
      id: resolutionId,
      title: "Approve annual budget v2",
      description: "Updated budget scope after finance review",
      status: "proposed",
    });
  });

  it("withdraws a resolution and blocks subsequent updates", async () => {
    const meetingId = await createMeeting(app);
    const resolutionId = await proposeResolution(app, meetingId);

    const withdrawRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/comm-board-meetings/resolutions/withdraw",
      payload: {
        idempotencyKey: uniqueKey("resolution-withdraw"),
        resolutionId,
        reason: "Moved to next quarter board cycle",
      },
    });

    expect(withdrawRes.statusCode).toBe(200);
    expect(withdrawRes.json().data).toMatchObject({ id: resolutionId });

    const listRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "GET",
      url: `/v1/comm-board-meetings/${meetingId}/resolutions`,
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data).toHaveLength(1);
    expect(listRes.json().data[0]).toMatchObject({
      id: resolutionId,
      status: "tabled",
    });

    const updateAfterWithdrawRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/comm-board-meetings/resolutions/update",
      payload: {
        idempotencyKey: uniqueKey("resolution-update-after-withdraw"),
        resolutionId,
        title: "Should be rejected",
      },
    });

    expect(updateAfterWithdrawRes.statusCode).toBe(400);
    expect(updateAfterWithdrawRes.json()).toMatchObject({
      error: {
        code: "COMM_RESOLUTION_IS_WITHDRAWN",
      },
    });
  });

  it("maps missing resolution to 404 for update and withdraw", async () => {
    const missingResolutionId = crypto.randomUUID();

    const updateMissingRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/comm-board-meetings/resolutions/update",
      payload: {
        idempotencyKey: uniqueKey("resolution-update-missing"),
        resolutionId: missingResolutionId,
        title: "Missing",
      },
    });

    expect(updateMissingRes.statusCode).toBe(404);
    expect(updateMissingRes.json()).toMatchObject({
      error: {
        code: "COMM_RESOLUTION_NOT_FOUND",
      },
    });

    const withdrawMissingRes = await injectAsWithCorrelation(app, SUBMITTER_EMAIL, {
      method: "POST",
      url: "/v1/commands/comm-board-meetings/resolutions/withdraw",
      payload: {
        idempotencyKey: uniqueKey("resolution-withdraw-missing"),
        resolutionId: missingResolutionId,
      },
    });

    expect(withdrawMissingRes.statusCode).toBe(404);
    expect(withdrawMissingRes.json()).toMatchObject({
      error: {
        code: "COMM_RESOLUTION_NOT_FOUND",
      },
    });
  });
});

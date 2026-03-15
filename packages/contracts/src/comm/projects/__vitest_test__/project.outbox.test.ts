import { describe, expect, it } from "vitest";
import { CommProjectEvents } from "../project.events.js";
import { ProjectOutboxRecordSchema } from "../project.outbox.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const MILESTONE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const RECORD_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-01-02T10:00:00.000Z";

describe("project.outbox – ProjectOutboxRecordSchema", () => {
  it("accepts Created with valid payload", () => {
    const result = ProjectOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommProjectEvents.Created,
      payload: {
        projectId: PROJECT_ID,
        orgId: ORG_ID,
        name: "New Project",
        status: "planning",
        visibility: "org",
        ownerId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects Created with invalid payload", () => {
    const result = ProjectOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommProjectEvents.Created,
      payload: { orgId: ORG_ID },
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("accepts StatusChanged with valid payload", () => {
    const result = ProjectOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommProjectEvents.StatusChanged,
      payload: {
        projectId: PROJECT_ID,
        orgId: ORG_ID,
        fromStatus: "planning",
        toStatus: "active",
        changedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts MilestoneCompleted with valid payload", () => {
    const result = ProjectOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommProjectEvents.MilestoneCompleted,
      payload: {
        projectId: PROJECT_ID,
        orgId: ORG_ID,
        milestoneId: MILESTONE_ID,
        completedAt: NOW,
        completedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event name", () => {
    const result = ProjectOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: "COMM.PROJECT_UNKNOWN",
      payload: {},
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });
});

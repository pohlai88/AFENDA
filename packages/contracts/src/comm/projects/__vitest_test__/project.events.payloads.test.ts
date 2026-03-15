import { describe, expect, it } from "vitest";
import {
  ProjectArchivedEventSchema,
  ProjectCreatedEventSchema,
  ProjectDeletedEventSchema,
  ProjectMemberAddedEventSchema,
  ProjectMemberRemovedEventSchema,
  ProjectMilestoneCompletedEventSchema,
  ProjectMilestoneCreatedEventSchema,
  ProjectStatusChangedEventSchema,
  ProjectUpdatedEventSchema,
} from "../project.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const MILESTONE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const NOW = "2026-01-02T10:00:00.000Z";

describe("project.events.payloads – ProjectCreatedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectCreatedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      name: "New Website",
      status: "planning",
      visibility: "org",
      ownerId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = ProjectCreatedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      name: "New Website",
      status: "unknown",
      visibility: "org",
      ownerId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("project.events.payloads – ProjectUpdatedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectUpdatedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      updatedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectStatusChangedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectStatusChangedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      fromStatus: "planning",
      toStatus: "active",
      changedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectArchivedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectArchivedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      archivedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectDeletedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectDeletedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      deletedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectMemberAddedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectMemberAddedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      role: "editor",
      addedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectMemberRemovedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectMemberRemovedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      removedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectMilestoneCreatedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectMilestoneCreatedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      milestoneId: MILESTONE_ID,
      name: "Alpha Release",
      targetDate: "2026-06-01",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.events.payloads – ProjectMilestoneCompletedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = ProjectMilestoneCompletedEventSchema.safeParse({
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      milestoneId: MILESTONE_ID,
      completedAt: NOW,
      completedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

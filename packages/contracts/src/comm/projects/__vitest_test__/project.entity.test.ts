import { describe, expect, it } from "vitest";
import {
  ProjectMemberSchema,
  ProjectMilestoneSchema,
  ProjectSchema,
  ProjectStatusValues,
  ProjectVisibilityValues,
  ProjectMemberRoleValues,
} from "../project.entity.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const MEMBER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MILESTONE_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const NOW = "2026-01-02T10:00:00.000Z";

const BASE_PROJECT = {
  id: PROJECT_ID,
  orgId: ORG_ID,
  projectNumber: "PROJ-001",
  name: "Website Redesign",
  status: "active",
  visibility: "org",
  ownerId: PRINCIPAL_ID,
  createdAt: NOW,
  updatedAt: NOW,
} as const;

describe("project.entity – ProjectSchema", () => {
  it("accepts a valid project", () => {
    const result = ProjectSchema.safeParse(BASE_PROJECT);
    expect(result.success).toBe(true);
  });

  it("accepts a completed project with completedAt", () => {
    const result = ProjectSchema.safeParse({
      ...BASE_PROJECT,
      status: "completed",
      completedAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects completed project without completedAt", () => {
    const result = ProjectSchema.safeParse({
      ...BASE_PROJECT,
      status: "completed",
    });
    expect(result.success).toBe(false);
  });

  it("has expected status values", () => {
    expect(ProjectStatusValues).toContain("planning");
    expect(ProjectStatusValues).toContain("active");
    expect(ProjectStatusValues).toContain("completed");
    expect(ProjectStatusValues).toContain("archived");
  });

  it("has expected visibility values", () => {
    expect(ProjectVisibilityValues).toContain("org");
    expect(ProjectVisibilityValues).toContain("team");
    expect(ProjectVisibilityValues).toContain("private");
  });

  it("has expected member role values", () => {
    expect(ProjectMemberRoleValues).toContain("owner");
    expect(ProjectMemberRoleValues).toContain("editor");
    expect(ProjectMemberRoleValues).toContain("viewer");
  });
});

describe("project.entity – ProjectMemberSchema", () => {
  it("accepts a valid member", () => {
    const result = ProjectMemberSchema.safeParse({
      id: MEMBER_ID,
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      principalId: PRINCIPAL_ID,
      role: "editor",
      joinedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.entity – ProjectMilestoneSchema", () => {
  it("accepts a valid milestone", () => {
    const result = ProjectMilestoneSchema.safeParse({
      id: MILESTONE_ID,
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      milestoneNumber: "MS-001",
      name: "Alpha Release",
      status: "planned",
      targetDate: "2026-06-01",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

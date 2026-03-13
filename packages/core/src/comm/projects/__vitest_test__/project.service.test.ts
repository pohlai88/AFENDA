import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AddProjectMemberCommand,
  CommProjectId,
  CommProjectMilestoneId,
  CompleteProjectMilestoneCommand,
  CorrelationId,
  CreateProjectCommand,
  OrgId,
  PrincipalId,
  TransitionProjectStatusCommand,
  UpdateProjectCommand,
} from "@afenda/contracts";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as CorrelationId;
const PROJECT_ID = "11111111-1111-4111-1111-111111111111" as CommProjectId;
const MEMBER_ID = "22222222-2222-4222-2222-222222222222" as PrincipalId;
const MILESTONE_ID = "33333333-3333-4333-3333-333333333333" as CommProjectMilestoneId;

let mockSelectRows: Array<Record<string, unknown>> = [];
let projectReturningRows: Array<{ id: string; projectNumber: string }> = [];
let milestoneReturningRows: Array<{ id: string; milestoneNumber: string }> = [];
let insertedRecords: Array<{ table: string; values: unknown }> = [];

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});

const mockDelete = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue(undefined),
});

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockImplementation(() => Promise.resolve(mockSelectRows)),
  }),
});

const mockInsert = vi.fn().mockImplementation((table: { __table?: string }) => {
  if (table.__table === "commProject") {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(projectReturningRows.length ? projectReturningRows : []),
          ),
      }),
    };
  }

  if (table.__table === "commProjectMilestone") {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(milestoneReturningRows.length ? milestoneReturningRows : []),
          ),
      }),
    };
  }

  return {
    values: vi.fn().mockImplementation((values: unknown) => {
      insertedRecords.push({ table: table.__table ?? "unknown", values });
      return Promise.resolve(undefined);
    }),
  };
});

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock("@afenda/db", () => ({
  commProject: { __table: "commProject", id: "id", status: "status", orgId: "orgId" },
  commProjectMember: {
    __table: "commProjectMember",
    id: "id",
    orgId: "orgId",
    projectId: "projectId",
    principalId: "principalId",
  },
  commProjectMilestone: {
    __table: "commProjectMilestone",
    id: "id",
    status: "status",
    orgId: "orgId",
    projectId: "projectId",
    milestoneNumber: "milestoneNumber",
  },
  commProjectStatusHistory: { __table: "commProjectStatusHistory" },
  outboxEvent: { __table: "outboxEvent" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
  sql: vi.fn((parts: TemplateStringsArray) => ({ sql: parts[0] })),
}));

vi.mock("../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _audit: unknown, fn: (tx: unknown) => unknown) =>
      fn(mockTx),
  ),
}));

import {
  addProjectMember,
  completeProjectMilestone,
  createProject,
  transitionProjectStatus,
  updateProject,
} from "../project.service";

describe("project.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectRows = [];
    projectReturningRows = [];
    milestoneReturningRows = [];
    insertedRecords = [];
  });

  it("returns IAM_PRINCIPAL_NOT_FOUND when creating project without principal", async () => {
    const command: CreateProjectCommand = {
      idempotencyKey: "idem-1",
      name: "Treasury Automation",
    };

    const result = await createProject(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: null },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_PRINCIPAL_NOT_FOUND");
    }
  });

  it("creates project and emits COMM.PROJECT_CREATED", async () => {
    projectReturningRows = [{ id: PROJECT_ID, projectNumber: "PRJ-ABCD1234" }];

    const command: CreateProjectCommand = {
      idempotencyKey: "idem-2",
      name: "Boardroom Governance",
      visibility: "team",
    };

    const result = await createProject(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(PROJECT_ID);
      expect(result.data.projectNumber).toMatch(/^PRJ-/);
    }

    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "outboxEvent",
        values: expect.objectContaining({ type: "COMM.PROJECT_CREATED" }),
      }),
    );
  });

  it("returns COMM_PROJECT_NOT_FOUND when updating missing project", async () => {
    mockSelectRows = [];

    const command: UpdateProjectCommand = {
      idempotencyKey: "idem-3",
      projectId: PROJECT_ID,
      name: "Updated Name",
    };

    const result = await updateProject(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_PROJECT_NOT_FOUND");
      expect(result.error.meta?.projectId).toBe(PROJECT_ID);
    }
  });

  it("rejects invalid project status transition", async () => {
    mockSelectRows = [{ id: PROJECT_ID, status: "completed" }];

    const command: TransitionProjectStatusCommand = {
      idempotencyKey: "idem-4",
      projectId: PROJECT_ID,
      toStatus: "active",
    };

    const result = await transitionProjectStatus(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_PROJECT_INVALID_STATUS_TRANSITION");
      expect(result.error.meta?.fromStatus).toBe("completed");
      expect(result.error.meta?.toStatus).toBe("active");
    }
  });

  it("returns COMM_PROJECT_MEMBER_ALREADY_EXISTS when member already attached", async () => {
    mockSelectRows = [{ id: PROJECT_ID, status: "planning" }];

    const command: AddProjectMemberCommand = {
      idempotencyKey: "idem-5",
      projectId: PROJECT_ID,
      principalId: MEMBER_ID,
      role: "editor",
    };

    const originalSelect = mockSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: PROJECT_ID, status: "planning" }]),
      }),
    }));

    mockSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "existing-member" }]),
      }),
    }));

    const result = await addProjectMember(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_PROJECT_MEMBER_ALREADY_EXISTS");
    }

    expect(originalSelect).toBeDefined();
  });

  it("returns COMM_PROJECT_MILESTONE_ALREADY_COMPLETED for already completed milestone", async () => {
    const command: CompleteProjectMilestoneCommand = {
      idempotencyKey: "idem-6",
      milestoneId: MILESTONE_ID,
    };

    mockSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: MILESTONE_ID, status: "completed" }]),
      }),
    }));

    const result = await completeProjectMilestone(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_PROJECT_MILESTONE_ALREADY_COMPLETED");
      expect(result.error.meta?.milestoneId).toBe(MILESTONE_ID);
    }
  });

  it("transitions project status and emits history + outbox", async () => {
    mockSelectRows = [{ id: PROJECT_ID, status: "planning" }];

    const command: TransitionProjectStatusCommand = {
      idempotencyKey: "idem-7",
      projectId: PROJECT_ID,
      toStatus: "active",
      reason: "Kickoff approved",
    };

    const result = await transitionProjectStatus(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(PROJECT_ID);
      expect(result.data.status).toBe("active");
    }

    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "commProjectStatusHistory",
        values: expect.objectContaining({
          projectId: PROJECT_ID,
          fromStatus: "planning",
          toStatus: "active",
        }),
      }),
    );
    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "outboxEvent",
        values: expect.objectContaining({ type: "COMM.PROJECT_STATUS_CHANGED" }),
      }),
    );
  });

  it("adds project member and emits outbox", async () => {
    mockSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: PROJECT_ID, status: "planning" }]),
      }),
    }));

    mockSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }));

    const command: AddProjectMemberCommand = {
      idempotencyKey: "idem-8",
      projectId: PROJECT_ID,
      principalId: MEMBER_ID,
      role: "viewer",
    };

    const result = await addProjectMember(
      mockDb as never,
      { activeContext: { orgId: ORG_ID } },
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(PROJECT_ID);
      expect(result.data.principalId).toBe(MEMBER_ID);
    }

    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "commProjectMember",
        values: expect.objectContaining({ projectId: PROJECT_ID, principalId: MEMBER_ID }),
      }),
    );
    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "outboxEvent",
        values: expect.objectContaining({ type: "COMM.PROJECT_MEMBER_ADDED" }),
      }),
    );
  });
});

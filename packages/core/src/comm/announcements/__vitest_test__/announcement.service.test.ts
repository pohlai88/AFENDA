import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnnouncementId,
  CorrelationId,
  OrgId,
  PrincipalId,
  CreateAnnouncementCommand,
  PublishAnnouncementCommand,
  ScheduleAnnouncementCommand,
  AcknowledgeAnnouncementCommand,
} from "@afenda/contracts";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as CorrelationId;
const ANNOUNCEMENT_ID = "11111111-1111-4111-8111-111111111111" as AnnouncementId;

let selectRows: Record<string, unknown>[] = [];
let insertedRecords: { table: string; values: unknown }[] = [];

const announcementReturning = {
  id: ANNOUNCEMENT_ID,
  announcementNumber: "ANN-TEST001",
};

const readReturning = {
  id: "22222222-2222-4222-8222-222222222222",
};

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockImplementation(async () => selectRows),
  }),
});

const mockInsert = vi.fn().mockImplementation((table: { __table?: string }) => {
  if (table.__table === "commAnnouncement") {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([announcementReturning]),
      }),
    };
  }

  if (table.__table === "commAnnouncementRead") {
    const onConflictDoUpdate = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([readReturning]),
    });

    return {
      values: vi.fn().mockReturnValue({ onConflictDoUpdate }),
    };
  }

  return {
    values: vi.fn().mockImplementation(async (values: unknown) => {
      insertedRecords.push({ table: table.__table ?? "unknown", values });
      return undefined;
    }),
  };
});

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: ANNOUNCEMENT_ID }]),
    }),
  }),
});

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("@afenda/db", () => ({
  commAnnouncement: { __table: "commAnnouncement", id: "id", orgId: "orgId", status: "status" },
  commAnnouncementRead: {
    __table: "commAnnouncementRead",
    id: "id",
    orgId: "orgId",
    announcementId: "announcementId",
    principalId: "principalId",
  },
  outboxEvent: { __table: "outboxEvent" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
  sql: vi.fn((parts: TemplateStringsArray) => ({ sql: parts[0] })),
}));

vi.mock("../../../kernel/governance/audit/audit.js", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _audit: unknown, fn: (tx: unknown) => unknown) =>
      fn(mockTx),
  ),
}));

import {
  acknowledgeAnnouncement,
  createAnnouncement,
  publishAnnouncement,
  scheduleAnnouncement,
} from "../announcement.service";

function makeCtx() {
  return { activeContext: { orgId: ORG_ID } };
}

describe("announcement.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectRows = [];
    insertedRecords = [];
  });

  it("returns COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE when creating with past scheduledAt", async () => {
    const pastAt = new Date(Date.now() - 60_000).toISOString();
    const command: CreateAnnouncementCommand = {
      idempotencyKey: "idem-past",
      title: "Policy",
      body: "Body",
      audienceType: "org",
      audienceIds: [],
      scheduledAt: pastAt,
    };

    const result = await createAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE");
    }
  });

  it("returns IAM_PRINCIPAL_NOT_FOUND when creating announcement without principal", async () => {
    const command: CreateAnnouncementCommand = {
      idempotencyKey: "idem-1",
      title: "Policy",
      body: "Body",
      audienceType: "org",
      audienceIds: [],
    };

    const result = await createAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: null },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_PRINCIPAL_NOT_FOUND");
    }
  });

  it("returns COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE for schedule when scheduledAt is past", async () => {
    selectRows = [
      {
        id: ANNOUNCEMENT_ID,
        orgId: ORG_ID,
        announcementNumber: "ANN-TEST002",
        title: "Draft",
        status: "draft",
      },
    ];

    const pastAt = new Date(Date.now() - 60_000).toISOString();
    const command: ScheduleAnnouncementCommand = {
      idempotencyKey: "idem-sched-past",
      announcementId: ANNOUNCEMENT_ID,
      scheduledAt: pastAt,
    };

    const result = await scheduleAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE");
    }
  });

  it("returns COMM_ANNOUNCEMENT_NOT_FOUND for publish when announcement is missing", async () => {
    selectRows = [];

    const command: PublishAnnouncementCommand = {
      idempotencyKey: "idem-2",
      announcementId: ANNOUNCEMENT_ID,
    };

    const result = await publishAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_ANNOUNCEMENT_NOT_FOUND");
    }
  });

  it("rejects acknowledge when announcement is not published", async () => {
    selectRows = [
      {
        id: ANNOUNCEMENT_ID,
        orgId: ORG_ID,
        announcementNumber: "ANN-TEST003",
        title: "Draft announcement",
        status: "draft",
      },
    ];

    const command: AcknowledgeAnnouncementCommand = {
      idempotencyKey: "idem-3",
      announcementId: ANNOUNCEMENT_ID,
    };

    const result = await acknowledgeAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_ANNOUNCEMENT_NOT_PUBLISHED");
    }
  });

  it("acknowledges published announcement idempotently and emits outbox event", async () => {
    selectRows = [
      {
        id: ANNOUNCEMENT_ID,
        orgId: ORG_ID,
        announcementNumber: "ANN-TEST004",
        title: "Published announcement",
        status: "published",
      },
    ];

    const command: AcknowledgeAnnouncementCommand = {
      idempotencyKey: "idem-4",
      announcementId: ANNOUNCEMENT_ID,
    };

    const result = await acknowledgeAnnouncement(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(readReturning.id);
    }

    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "outboxEvent",
        values: expect.objectContaining({ type: "COMM.ANNOUNCEMENT_ACKNOWLEDGED" }),
      }),
    );

    const announcementReadInsert = mockInsert.mock.results.find(
      (resultEntry) => (resultEntry.value as { values?: unknown })?.values,
    );
    expect(announcementReadInsert).toBeDefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnouncementId, OrgId } from "@afenda/contracts";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const ANNOUNCEMENT_ID = "11111111-1111-4111-8111-111111111111" as AnnouncementId;

let announcementRows: Array<Record<string, unknown>> = [];
let audiencePrincipalRows: Array<Record<string, unknown>> = [];
let acknowledgedPrincipalRows: Array<Record<string, unknown>> = [];

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn((table: { __table?: string }) => ({
      where: vi.fn(async () => {
        if (table.__table === "commAnnouncement") {
          return announcementRows;
        }
        return [];
      }),
      orderBy: vi.fn(async () => []),
      limit: vi.fn(async () => []),
    })),
  })),
  selectDistinct: vi.fn(() => ({
    from: vi.fn((table: { __table?: string }) => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(async () => audiencePrincipalRows),
      })),
      where: vi.fn(async () => {
        if (table.__table === "commAnnouncementRead") {
          return acknowledgedPrincipalRows;
        }
        return [];
      }),
    })),
  })),
};

vi.mock("@afenda/db", () => ({
  commAnnouncement: {
    __table: "commAnnouncement",
    id: "id",
    orgId: "orgId",
    status: "status",
    audienceType: "audienceType",
    audienceIds: "audienceIds",
  },
  commAnnouncementRead: {
    __table: "commAnnouncementRead",
    orgId: "orgId",
    announcementId: "announcementId",
    principalId: "principalId",
  },
  iamPrincipalRole: {
    __table: "iamPrincipalRole",
    orgId: "orgId",
    roleId: "roleId",
    principalId: "principalId",
  },
  iamRole: { id: "id", orgId: "orgId", name: "name" },
  membership: {
    __table: "membership",
    orgId: "orgId",
    principalId: "principalId",
    partyRoleId: "partyRoleId",
    status: "status",
    revokedAt: "revokedAt",
  },
  organization: { id: "id", name: "name", orgId: "orgId" },
  party: { id: "id", orgId: "orgId", displayName: "displayName" },
  partyRole: { id: "id", orgId: "orgId" },
  person: { id: "id", firstName: "firstName", lastName: "lastName" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  asc: vi.fn((field) => field),
  desc: vi.fn((field) => field),
  eq: vi.fn((field, value) => ({ field, value })),
  gt: vi.fn((field, value) => ({ field, value })),
  inArray: vi.fn((field, values) => ({ field, values })),
  isNull: vi.fn((field) => ({ field, op: "isNull" })),
}));

import { getAnnouncementAckSummary } from "../announcement.queries";

describe("announcement.queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    announcementRows = [];
    audiencePrincipalRows = [];
    acknowledgedPrincipalRows = [];
  });

  it("returns null when announcement does not exist", async () => {
    announcementRows = [];

    const summary = await getAnnouncementAckSummary(mockDb as never, ORG_ID, ANNOUNCEMENT_ID);

    expect(summary).toBeNull();
  });

  it("returns accurate target and acknowledgement counts for org audience", async () => {
    announcementRows = [
      {
        id: ANNOUNCEMENT_ID,
        orgId: ORG_ID,
        announcementNumber: "ANN-TEST001",
        title: "Org memo",
        body: "Body",
        status: "published",
        audienceType: "org",
        audienceIds: [],
        scheduledAt: null,
        publishedAt: null,
        publishedByPrincipalId: null,
        createdByPrincipalId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
        createdAt: new Date("2026-03-13T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      },
    ];

    audiencePrincipalRows = [{ principalId: "p-1" }, { principalId: "p-2" }];
    acknowledgedPrincipalRows = [{ principalId: "p-1" }];

    const summary = await getAnnouncementAckSummary(mockDb as never, ORG_ID, ANNOUNCEMENT_ID);

    expect(summary).not.toBeNull();
    expect(summary?.targetedCount).toBe(2);
    expect(summary?.acknowledgedCount).toBe(1);
    expect(summary?.pendingCount).toBe(1);
    expect(summary?.progressPercent).toBe(50);
  });
});

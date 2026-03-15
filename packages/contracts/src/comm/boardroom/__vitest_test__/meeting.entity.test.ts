import { describe, expect, it } from "vitest";
import { BoardMeetingSchema } from "../meeting.entity.js";

describe("meeting.entity", () => {
  it("parses a valid scheduled board meeting", () => {
    const parsed = BoardMeetingSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingNumber: "BM-001",
      title: "Quarterly board meeting",
      description: null,
      status: "scheduled",
      scheduledAt: "2026-06-01T09:00:00.000Z",
      duration: 120,
      location: "HQ",
      chairId: "22222222-2222-4222-8222-222222222222",
      secretaryId: "33333333-3333-4333-8333-333333333333",
      quorumRequired: 3,
      startedAt: null,
      adjournedAt: null,
      createdByPrincipalId: "44444444-4444-4444-8444-444444444444",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(parsed.status).toBe("scheduled");
  });

  it("rejects scheduled meetings without scheduledAt", () => {
    const result = BoardMeetingSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingNumber: "BM-001",
      title: "Quarterly board meeting",
      description: null,
      status: "scheduled",
      scheduledAt: null,
      duration: 120,
      location: null,
      chairId: "22222222-2222-4222-8222-222222222222",
      secretaryId: null,
      quorumRequired: 3,
      startedAt: null,
      adjournedAt: null,
      createdByPrincipalId: "44444444-4444-4444-8444-444444444444",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects secretary matching chair", () => {
    const result = BoardMeetingSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingNumber: "BM-001",
      title: "Quarterly board meeting",
      description: null,
      status: "draft",
      scheduledAt: null,
      duration: 120,
      location: null,
      chairId: "22222222-2222-4222-8222-222222222222",
      secretaryId: "22222222-2222-4222-8222-222222222222",
      quorumRequired: 3,
      startedAt: null,
      adjournedAt: null,
      createdByPrincipalId: "44444444-4444-4444-8444-444444444444",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

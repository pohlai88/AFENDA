import { describe, expect, it } from "vitest";
import {
  GetBoardMeetingResponseSchema,
  ListBoardMeetingsQuerySchema,
  SearchBoardMeetingsQuerySchema,
} from "../meeting.queries.js";

describe("meeting.queries", () => {
  it("rejects invalid scheduled date order", () => {
    const result = ListBoardMeetingsQuerySchema.safeParse({
      scheduledAfter: "2026-06-10",
      scheduledBefore: "2026-06-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("applies the default search limit", () => {
    const parsed = SearchBoardMeetingsQuerySchema.parse({
      query: "quarterly",
    });

    expect(parsed.limit).toBe(20);
  });

  it("rejects invalid scheduled date order for search", () => {
    const result = SearchBoardMeetingsQuerySchema.safeParse({
      query: "quarterly",
      scheduledAfter: "2026-06-10",
      scheduledBefore: "2026-06-01",
    });

    expect(result.success).toBe(false);
  });

  it("parses the detail response schema", () => {
    const parsed = GetBoardMeetingResponseSchema.parse({
      data: {
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
        secretaryId: null,
        quorumRequired: 3,
        startedAt: null,
        adjournedAt: null,
        createdByPrincipalId: "44444444-4444-4444-8444-444444444444",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-01T09:00:00.000Z",
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.data.meetingNumber).toBe("BM-001");
  });
});

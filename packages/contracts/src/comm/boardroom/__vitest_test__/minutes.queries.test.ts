import { describe, expect, it } from "vitest";
import {
  GetBoardActionItemResponseSchema,
  GetBoardMinuteResponseSchema,
  ListBoardActionItemsQuerySchema,
} from "../minutes.queries.js";

describe("minutes.queries", () => {
  it("applies the default list limit for action items", () => {
    const parsed = ListBoardActionItemsQuerySchema.parse({
      minuteId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.limit).toBe(50);
  });

  it("parses the board minute detail response schema", () => {
    const parsed = GetBoardMinuteResponseSchema.parse({
      data: {
        id: "99999999-9999-4999-8999-999999999999",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        meetingId: "11111111-1111-4111-8111-111111111111",
        resolutionId: null,
        createdByPrincipalId: "22222222-2222-4222-8222-222222222222",
        recordedAt: "2026-06-01T10:00:00.000Z",
        content: "Resolved to approve budget.",
        metadata: {},
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(parsed.data.content).toContain("approve budget");
  });

  it("parses the action item detail response schema", () => {
    const parsed = GetBoardActionItemResponseSchema.parse({
      data: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        minuteId: "99999999-9999-4999-8999-999999999999",
        title: "Send follow-up",
        description: null,
        assigneeId: null,
        dueDate: null,
        status: "open",
        createdByPrincipalId: "22222222-2222-4222-8222-222222222222",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        closedAt: null,
      },
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(parsed.data.status).toBe("open");
  });
});

import { describe, expect, it } from "vitest";
import { BoardActionItemSchema, BoardMinuteSchema } from "../minutes.entity.js";

describe("minutes.entity", () => {
  it("parses a board minute", () => {
    const parsed = BoardMinuteSchema.parse({
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
    });

    expect(parsed.metadata).toEqual({});
  });

  it("rejects closed action items without closedAt", () => {
    const result = BoardActionItemSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      title: "Send follow-up",
      description: null,
      assigneeId: null,
      dueDate: null,
      status: "done",
      createdByPrincipalId: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      closedAt: null,
    });

    expect(result.success).toBe(false);
  });
});

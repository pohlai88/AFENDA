import { describe, expect, it } from "vitest";
import { BoardMeetingAttendeeSchema } from "../attendee.entity.js";

describe("attendee.entity", () => {
  it("parses a valid attendee", () => {
    const parsed = BoardMeetingAttendeeSchema.parse({
      id: "66666666-6666-4666-8666-666666666666",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      principalId: "22222222-2222-4222-8222-222222222222",
      status: "invited",
      role: "observer",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(parsed.role).toBe("observer");
  });

  it("rejects empty role strings", () => {
    const result = BoardMeetingAttendeeSchema.safeParse({
      id: "66666666-6666-4666-8666-666666666666",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      principalId: "22222222-2222-4222-8222-222222222222",
      status: "invited",
      role: "   ",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

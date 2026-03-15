import { describe, expect, it } from "vitest";
import {
  AdjournBoardMeetingCommandSchema,
  CancelBoardMeetingCommandSchema,
  CreateBoardMeetingCommandSchema,
  UpdateBoardMeetingCommandSchema,
} from "../meeting.commands.js";

describe("meeting.commands", () => {
  it("applies defaults for create meeting", () => {
    const parsed = CreateBoardMeetingCommandSchema.parse({
      idempotencyKey: "idem-meeting-create-1",
      title: "Quarterly board meeting",
      chairId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.duration).toBe(60);
    expect(parsed.secretaryId).toBeNull();
    expect(parsed.scheduledAt).toBeNull();
  });

  it("rejects empty update commands", () => {
    const result = UpdateBoardMeetingCommandSchema.safeParse({
      idempotencyKey: "idem-meeting-update-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(false);
  });

  it("parses adjourn command with note", () => {
    const parsed = AdjournBoardMeetingCommandSchema.parse({
      idempotencyKey: "idem-meeting-adjourn-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      note: "Lunch break",
    });

    expect(parsed.note).toBe("Lunch break");
  });

  it("rejects adjourn command with empty note", () => {
    const result = AdjournBoardMeetingCommandSchema.safeParse({
      idempotencyKey: "idem-meeting-adjourn-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      note: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cancel command with empty reason", () => {
    const result = CancelBoardMeetingCommandSchema.safeParse({
      idempotencyKey: "idem-meeting-cancel-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      reason: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects adjourn command without note", () => {
    const result = AdjournBoardMeetingCommandSchema.safeParse({
      idempotencyKey: "idem-meeting-adjourn-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cancel command without reason", () => {
    const result = CancelBoardMeetingCommandSchema.safeParse({
      idempotencyKey: "idem-meeting-cancel-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(false);
  });
});

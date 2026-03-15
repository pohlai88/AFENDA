import { describe, expect, it } from "vitest";
import { AddAttendeeCommandSchema, UpdateAttendeeCommandSchema } from "../attendee.commands.js";

describe("attendee.commands", () => {
  it("applies defaults for add attendee", () => {
    const parsed = AddAttendeeCommandSchema.parse({
      idempotencyKey: "idem-attendee-add-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      principalId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.role).toBeNull();
  });

  it("rejects empty update attendee commands", () => {
    const result = UpdateAttendeeCommandSchema.safeParse({
      idempotencyKey: "idem-attendee-update-1",
      attendeeId: "66666666-6666-4666-8666-666666666666",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty role strings on update", () => {
    const result = UpdateAttendeeCommandSchema.safeParse({
      idempotencyKey: "idem-attendee-update-2",
      attendeeId: "66666666-6666-4666-8666-666666666666",
      role: "   ",
    });

    expect(result.success).toBe(false);
  });
});

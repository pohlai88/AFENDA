import { describe, expect, it } from "vitest";
import {
  CommAttendeeAddedPayloadSchema,
  CommAttendeeUpdatedPayloadSchema,
  CommAttendeeStatusUpdatedPayloadSchema,
} from "../attendee.events.payloads.js";

describe("attendee.events.payloads", () => {
  it("parses attendee-added payload", () => {
    const parsed = CommAttendeeAddedPayloadSchema.parse({
      attendeeId: "66666666-6666-4666-8666-666666666666",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      principalId: "22222222-2222-4222-8222-222222222222",
      role: null,
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.role).toBeNull();
  });

  it("accepts attendee-updated payload with changed role only", () => {
    const parsed = CommAttendeeUpdatedPayloadSchema.parse({
      attendeeId: "66666666-6666-4666-8666-666666666666",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "observer",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.role).toBe("observer");
    expect(parsed.status).toBeUndefined();
  });

  it("rejects attendee-updated payload when neither status nor role is provided", () => {
    const result = CommAttendeeUpdatedPayloadSchema.safeParse({
      attendeeId: "66666666-6666-4666-8666-666666666666",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("rejects status-updated payload without status", () => {
    const result = CommAttendeeStatusUpdatedPayloadSchema.safeParse({
      attendeeId: "66666666-6666-4666-8666-666666666666",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });
});

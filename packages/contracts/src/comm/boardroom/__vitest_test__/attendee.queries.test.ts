import { describe, expect, it } from "vitest";
import {
  GetBoardAttendeeResponseSchema,
  ListBoardAttendeesQuerySchema,
} from "../attendee.queries.js";

describe("attendee.queries", () => {
  it("applies the default list limit", () => {
    const parsed = ListBoardAttendeesQuerySchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.limit).toBe(50);
  });

  it("parses the detail response schema", () => {
    const parsed = GetBoardAttendeeResponseSchema.parse({
      data: {
        id: "66666666-6666-4666-8666-666666666666",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        meetingId: "11111111-1111-4111-8111-111111111111",
        principalId: "22222222-2222-4222-8222-222222222222",
        status: "invited",
        role: null,
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-01T09:00:00.000Z",
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.data.status).toBe("invited");
  });
});

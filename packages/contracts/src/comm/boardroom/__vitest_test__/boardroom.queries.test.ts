import { describe, expect, it } from "vitest";
import { ListBoardAttendeesQuerySchema } from "../attendee.queries.js";
import {
  ListBoardMeetingsQuerySchema,
  SearchBoardMeetingsQuerySchema,
} from "../meeting.queries.js";
import { ListBoardResolutionVotesQuerySchema } from "../resolution.queries.js";

describe("boardroom.queries", () => {
  it("rejects meeting list query when scheduledBefore is earlier than scheduledAfter", () => {
    const result = ListBoardMeetingsQuerySchema.safeParse({
      scheduledAfter: "2026-06-10",
      scheduledBefore: "2026-06-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("applies default search limit for meeting search", () => {
    const parsed = SearchBoardMeetingsQuerySchema.parse({
      query: "quarterly",
    });

    expect(parsed.limit).toBe(20);
  });

  it("applies default list limit for attendees and resolution votes", () => {
    const attendees = ListBoardAttendeesQuerySchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
    });
    const votes = ListBoardResolutionVotesQuerySchema.parse({
      resolutionId: "22222222-2222-4222-8222-222222222222",
    });

    expect(attendees.limit).toBe(50);
    expect(votes.limit).toBe(50);
  });
});

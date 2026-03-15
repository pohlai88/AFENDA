import { describe, expect, it } from "vitest";
import {
  GetBoardResolutionResponseSchema,
  ListBoardResolutionVotesQuerySchema,
} from "../resolution.queries.js";

describe("resolution.queries", () => {
  it("applies the default list limit for votes", () => {
    const parsed = ListBoardResolutionVotesQuerySchema.parse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
    });

    expect(parsed.limit).toBe(50);
  });

  it("parses the detail response schema", () => {
    const parsed = GetBoardResolutionResponseSchema.parse({
      data: {
        id: "77777777-7777-4777-8777-777777777777",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        meetingId: "11111111-1111-4111-8111-111111111111",
        title: "Approve budget",
        description: null,
        status: "proposed",
        proposedById: "22222222-2222-4222-8222-222222222222",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-01T09:00:00.000Z",
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.data.title).toBe("Approve budget");
  });
});

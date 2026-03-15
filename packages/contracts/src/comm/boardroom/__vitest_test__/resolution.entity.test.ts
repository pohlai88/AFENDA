import { describe, expect, it } from "vitest";
import { BoardResolutionSchema, BoardResolutionVoteSchema } from "../resolution.entity.js";

describe("resolution.entity", () => {
  it("parses a valid resolution", () => {
    const parsed = BoardResolutionSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Approve budget",
      description: null,
      status: "proposed",
      proposedById: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(parsed.status).toBe("proposed");
  });

  it("parses a valid vote", () => {
    const parsed = BoardResolutionVoteSchema.parse({
      id: "88888888-8888-4888-8888-888888888888",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      resolutionId: "77777777-7777-4777-8777-777777777777",
      principalId: "22222222-2222-4222-8222-222222222222",
      vote: "for",
      createdAt: "2026-05-01T09:00:00.000Z",
    });

    expect(parsed.vote).toBe("for");
  });
});

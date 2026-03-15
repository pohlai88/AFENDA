import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  getAllowedResolutionStatusTransitions,
  ResolutionEventSchemas,
  ResolutionProposedPayloadSchema,
  ResolutionStatusChangePayloadSchema,
  ResolutionTransitionSchemas,
  ResolutionUpdatedPayloadSchema,
  ResolutionVoteCastPayloadSchema,
  ResolutionWithdrawnPayloadSchema,
  withResolutionStatusTransitionRefinement,
} from "../resolution.events.payloads.js";
import { ResolutionStatusSchema } from "../resolution.entity.js";

describe("resolution.events.payloads", () => {
  it("parses resolution-proposed payload", () => {
    const parsed = ResolutionProposedPayloadSchema.parse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Approve budget",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.title).toBe("Approve budget");
  });

  it("rejects vote-cast payload without vote", () => {
    const result = ResolutionVoteCastPayloadSchema.safeParse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      principalId: "22222222-2222-4222-8222-222222222222",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("requires status on updated and withdrawn payloads", () => {
    const updatedResult = ResolutionUpdatedPayloadSchema.safeParse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });
    const withdrawnResult = ResolutionWithdrawnPayloadSchema.safeParse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
      reason: "No longer needed",
    });

    expect(updatedResult.success).toBe(false);
    expect(withdrawnResult.success).toBe(false);
  });

  it("exports grouped event payload schemas", () => {
    expect(ResolutionEventSchemas.Proposed).toBe(ResolutionProposedPayloadSchema);
    expect(ResolutionEventSchemas.Updated).toBe(ResolutionUpdatedPayloadSchema);
    expect(ResolutionEventSchemas.Withdrawn).toBe(ResolutionWithdrawnPayloadSchema);
    expect(ResolutionEventSchemas.VoteCast).toBe(ResolutionVoteCastPayloadSchema);
    expect(ResolutionTransitionSchemas.StatusChange).toBe(ResolutionStatusChangePayloadSchema);
  });

  it("exposes allowed transitions by source status", () => {
    expect(getAllowedResolutionStatusTransitions("proposed")).toEqual([
      "discussed",
      "approved",
      "rejected",
      "deferred",
      "tabled",
    ]);
    expect(getAllowedResolutionStatusTransitions("approved")).toEqual([]);
  });

  it("accepts valid status transitions when refinement is applied", () => {
    const result = ResolutionStatusChangePayloadSchema.safeParse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
      fromStatus: "proposed",
      status: "discussed",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid status transitions when refinement is applied", () => {
    const result = ResolutionStatusChangePayloadSchema.safeParse({
      resolutionId: "77777777-7777-4777-8777-777777777777",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
      fromStatus: "approved",
      status: "discussed",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["status"]);
  });

  it("can still compose transition refinement on custom schemas", () => {
    const CustomTransitionSchema = withResolutionStatusTransitionRefinement(
      z.object({
        fromStatus: ResolutionStatusSchema,
        status: ResolutionStatusSchema,
      }),
    );

    const result = CustomTransitionSchema.safeParse({
      fromStatus: "deferred",
      status: "proposed",
    });

    expect(result.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  getResolutionCommandGuardViolation,
  ProposeResolutionCommandFieldsSchema,
  ResolutionFinalizedStatusValues,
  ResolutionOpenStatusValues,
  ResolutionWithdrawnStatusValues,
  ResolutionReasonSchema,
  UpdateResolutionCommandFieldsSchema,
  withResolutionUpdateRefinement,
} from "../resolution.shared.js";

describe("resolution.shared", () => {
  it("applies defaults for propose fields and nullable reason", () => {
    const propose = ProposeResolutionCommandFieldsSchema.parse({
      title: "Approve budget",
    });
    const reason = ResolutionReasonSchema.parse(null);

    expect(propose.description).toBeNull();
    expect(reason).toBeNull();
  });

  it("keeps update fields optional", () => {
    const parsed = UpdateResolutionCommandFieldsSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("enforces resolution update refinement", () => {
    const Schema = withResolutionUpdateRefinement(
      z.object({
        ...UpdateResolutionCommandFieldsSchema.shape,
      }),
    );

    const emptyResult = Schema.safeParse({});
    const validResult = Schema.safeParse({ title: "Revised budget" });

    expect(emptyResult.success).toBe(false);
    expect(validResult.success).toBe(true);
  });

  it("returns guard violations for finalized and withdrawn statuses", () => {
    const finalizedViolation = getResolutionCommandGuardViolation({
      status: ResolutionFinalizedStatusValues[0],
      action: "update",
    });
    const withdrawnViolation = getResolutionCommandGuardViolation({
      status: ResolutionWithdrawnStatusValues[0],
      action: "cast_vote",
    });

    expect(finalizedViolation?.code).toBe("COMM_RESOLUTION_IS_FINALIZED");
    expect(withdrawnViolation?.code).toBe("COMM_RESOLUTION_IS_WITHDRAWN");
  });

  it("allows guarded commands for open statuses", () => {
    const result = getResolutionCommandGuardViolation({
      status: ResolutionOpenStatusValues[0],
      action: "withdraw",
    });

    expect(result).toBeNull();
  });
});

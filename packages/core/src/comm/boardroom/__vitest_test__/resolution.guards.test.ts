import { describe, expect, it } from "vitest";

import { getResolutionStateGuardError } from "../resolution.guards.js";

describe("resolution.guards", () => {
  it("returns finalized error for approved/rejected statuses", () => {
    const result = getResolutionStateGuardError("approved", "update");

    expect(result).toEqual({
      code: "COMM_RESOLUTION_IS_FINALIZED",
      message: "Update is not allowed for finalized resolutions.",
    });
  });

  it("returns withdrawn error for deferred/tabled statuses", () => {
    const result = getResolutionStateGuardError("deferred", "cast_vote");

    expect(result).toEqual({
      code: "COMM_RESOLUTION_IS_WITHDRAWN",
      message: "Voting is not allowed for withdrawn resolutions.",
    });
  });

  it("allows commands for open statuses", () => {
    const result = getResolutionStateGuardError("proposed", "withdraw");

    expect(result).toBeNull();
  });
});

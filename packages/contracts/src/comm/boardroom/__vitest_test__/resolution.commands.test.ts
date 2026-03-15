import { describe, expect, it } from "vitest";
import {
  ProposeResolutionCommandSchema,
  ResolutionCommandSchemas,
  UpdateResolutionCommandSchema,
  WithdrawResolutionCommandSchema,
} from "../resolution.commands.js";

describe("resolution.commands", () => {
  it("applies defaults for proposed resolution", () => {
    const parsed = ProposeResolutionCommandSchema.parse({
      idempotencyKey: "idem-resolution-propose-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Approve budget",
    });

    expect(parsed.description).toBeNull();
  });

  it("rejects empty update commands", () => {
    const result = UpdateResolutionCommandSchema.safeParse({
      idempotencyKey: "idem-resolution-update-1",
      resolutionId: "77777777-7777-4777-8777-777777777777",
    });

    expect(result.success).toBe(false);
  });

  it("parses withdraw resolution command", () => {
    const parsed = WithdrawResolutionCommandSchema.parse({
      idempotencyKey: "idem-resolution-withdraw-1",
      resolutionId: "77777777-7777-4777-8777-777777777777",
      reason: "Superseded",
    });

    expect(parsed.reason).toBe("Superseded");
  });

  it("exports grouped command schemas", () => {
    expect(ResolutionCommandSchemas.Propose).toBe(ProposeResolutionCommandSchema);
    expect(ResolutionCommandSchemas.Update).toBe(UpdateResolutionCommandSchema);
    expect(ResolutionCommandSchemas.Withdraw).toBe(WithdrawResolutionCommandSchema);
  });
});

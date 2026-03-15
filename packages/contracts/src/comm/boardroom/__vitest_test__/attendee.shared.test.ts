import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AttendeeNullableRoleOptionalSchema,
  AttendeeNullableRoleSchema,
  AttendeeRoleOptionalSchema,
  AttendeeRoleSchema,
  withAttendeeUpdateRefinement,
} from "../attendee.shared.js";

describe("attendee.shared", () => {
  it("enforces non-empty role strings", () => {
    const result = AttendeeRoleSchema.safeParse("   ");

    expect(result.success).toBe(false);
  });

  it("supports optional and nullable role variants", () => {
    const optional = AttendeeRoleOptionalSchema.parse(undefined);
    const nullable = AttendeeNullableRoleSchema.parse(null);
    const nullableOptionalUndefined = AttendeeNullableRoleOptionalSchema.parse(undefined);
    const nullableOptionalNull = AttendeeNullableRoleOptionalSchema.parse(null);

    expect(optional).toBeUndefined();
    expect(nullable).toBeNull();
    expect(nullableOptionalUndefined).toBeUndefined();
    expect(nullableOptionalNull).toBeNull();
  });

  it("requires at least one attendee update field", () => {
    const UpdateSchema = withAttendeeUpdateRefinement(
      z.object({
        status: z.string().optional(),
        role: AttendeeNullableRoleOptionalSchema,
      }),
    );

    const emptyResult = UpdateSchema.safeParse({});
    const withStatus = UpdateSchema.safeParse({ status: "confirmed" });
    const withRole = UpdateSchema.safeParse({ role: null });

    expect(emptyResult.success).toBe(false);
    expect(withStatus.success).toBe(true);
    expect(withRole.success).toBe(true);
  });
});

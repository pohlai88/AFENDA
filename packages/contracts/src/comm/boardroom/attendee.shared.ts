import { z } from "zod";

export const AttendeeRoleSchema = z
  .string()
  .trim()
  .min(1, "Role must be non-empty if provided.")
  .max(64);

// Variant for partial update payloads where role can be omitted.
export const AttendeeRoleOptionalSchema = AttendeeRoleSchema.optional();

// Variant for persisted/event payloads where role may intentionally be null.
export const AttendeeNullableRoleSchema = AttendeeRoleSchema.nullable();

// Variant for update payloads where role may be omitted or explicitly nulled.
export const AttendeeNullableRoleOptionalSchema = AttendeeNullableRoleSchema.optional();

export type AttendeeUpdateData = {
  status?: string;
  role?: string | null;
};

export function addAttendeeUpdateIssue(
  data: AttendeeUpdateData,
  ctx: z.RefinementCtx,
): void {
  if (data.status === undefined && data.role === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of status or role must be provided.",
      path: [],
    });
  }
}

export function withAttendeeUpdateRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addAttendeeUpdateIssue(data as AttendeeUpdateData, ctx);
  }) as T;
}

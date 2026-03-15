import { z } from "zod";
import { COMM_RESOLUTION_IS_FINALIZED, COMM_RESOLUTION_IS_WITHDRAWN } from "../errors.js";
import { nullableDefault } from "./schema.helpers.js";
import { ResolutionStatusSchema, type ResolutionStatus } from "./resolution.entity.js";

export const ResolutionTitleSchema = z.string().trim().min(1).max(500);
export const ResolutionDescriptionSchema = z.string().trim().max(10_000);
export const ResolutionReasonTextSchema = z.string().trim().max(500);
export const ResolutionReasonSchema = nullableDefault(ResolutionReasonTextSchema);

export const ProposeResolutionCommandFieldsSchema = z.object({
  title: ResolutionTitleSchema,
  description: ResolutionDescriptionSchema.nullable().optional().default(null),
});

export const UpdateResolutionCommandFieldsSchema = z.object({
  title: ResolutionTitleSchema.optional(),
  description: ResolutionDescriptionSchema.nullable().optional(),
});

export type ResolutionUpdateFieldsData = {
  title?: string;
  description?: string | null;
};

export const ResolutionOpenStatusValues = [
  "proposed",
  "discussed",
] as const satisfies readonly ResolutionStatus[];

export const ResolutionFinalizedStatusValues = [
  "approved",
  "rejected",
] as const satisfies readonly ResolutionStatus[];

export const ResolutionWithdrawnStatusValues = [
  "deferred",
  "tabled",
] as const satisfies readonly ResolutionStatus[];

export const ResolutionCommandGuardActionValues = ["update", "withdraw", "cast_vote"] as const;

export const ResolutionCommandGuardActionSchema = z.enum(ResolutionCommandGuardActionValues);

export type ResolutionCommandGuardAction = (typeof ResolutionCommandGuardActionValues)[number];

export type ResolutionCommandGuardInput = {
  status: ResolutionStatus;
  action: ResolutionCommandGuardAction;
};

export type ResolutionCommandGuardViolation = {
  code: typeof COMM_RESOLUTION_IS_WITHDRAWN | typeof COMM_RESOLUTION_IS_FINALIZED;
  message: string;
};

export function getResolutionCommandGuardViolation(
  input: ResolutionCommandGuardInput,
): ResolutionCommandGuardViolation | null {
  const { action, status } = input;
  const actionLabel =
    action === "cast_vote" ? "Voting" : action === "withdraw" ? "Withdrawal" : "Update";

  if (
    ResolutionWithdrawnStatusValues.includes(
      status as (typeof ResolutionWithdrawnStatusValues)[number],
    )
  ) {
    return {
      code: COMM_RESOLUTION_IS_WITHDRAWN,
      message: `${actionLabel} is not allowed for withdrawn resolutions.`,
    };
  }

  if (
    ResolutionFinalizedStatusValues.includes(
      status as (typeof ResolutionFinalizedStatusValues)[number],
    )
  ) {
    return {
      code: COMM_RESOLUTION_IS_FINALIZED,
      message: `${actionLabel} is not allowed for finalized resolutions.`,
    };
  }

  return null;
}

export function addResolutionUpdateIssue(
  data: ResolutionUpdateFieldsData,
  ctx: z.RefinementCtx,
): void {
  if (data.title === undefined && data.description === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of title or description must be provided.",
      path: [],
    });
  }
}

export function withResolutionUpdateRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addResolutionUpdateIssue(data as ResolutionUpdateFieldsData, ctx);
  }) as T;
}

export const ResolutionCommandGuardStateSchema = z.object({
  status: ResolutionStatusSchema,
});

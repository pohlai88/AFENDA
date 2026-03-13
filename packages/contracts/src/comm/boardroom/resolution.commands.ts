import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardResolutionIdSchema, VoteSchema } from "./resolution.entity.js";

/** Reusable string schemas */
const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(10_000);
const ReasonSchema = z.string().trim().max(500);

/** Base schema for resolution-level commands */
const ResolutionCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  resolutionId: BoardResolutionIdSchema,
});

export const ProposeResolutionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  meetingId: BoardMeetingIdSchema,
  title: TitleSchema,
  description: DescriptionSchema.nullable().optional().default(null),
});

export const UpdateResolutionCommandSchema = ResolutionCommandBase.extend({
  title: TitleSchema.optional(),
  description: DescriptionSchema.nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.title === undefined && data.description === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of title or description must be provided.",
      path: [],
    });
  }
});

export const WithdrawResolutionCommandSchema = ResolutionCommandBase.extend({
  reason: ReasonSchema.optional(),
});

export const CastVoteCommandSchema = ResolutionCommandBase.extend({
  vote: VoteSchema,
});

export type ProposeResolutionCommand = z.infer<typeof ProposeResolutionCommandSchema>;
export type UpdateResolutionCommand = z.infer<typeof UpdateResolutionCommandSchema>;
export type WithdrawResolutionCommand = z.infer<typeof WithdrawResolutionCommandSchema>;
export type CastVoteCommand = z.infer<typeof CastVoteCommandSchema>;

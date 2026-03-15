import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardResolutionIdSchema, VoteSchema } from "./resolution.entity.js";
import {
  ProposeResolutionCommandFieldsSchema,
  ResolutionReasonTextSchema,
  UpdateResolutionCommandFieldsSchema,
  withResolutionUpdateRefinement,
} from "./resolution.shared.js";

/** Base schema for resolution-level commands */
const ResolutionCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  resolutionId: BoardResolutionIdSchema,
});

export const ProposeResolutionCommandSchema = ResolutionCommandBase
  .omit({ resolutionId: true })
  .extend({
    meetingId: BoardMeetingIdSchema,
    ...ProposeResolutionCommandFieldsSchema.shape,
  });

export const UpdateResolutionCommandSchema = withResolutionUpdateRefinement(
  ResolutionCommandBase.extend({
    ...UpdateResolutionCommandFieldsSchema.shape,
  }),
);

export const WithdrawResolutionCommandSchema = ResolutionCommandBase.extend({
  reason: ResolutionReasonTextSchema.optional(),
});

export const CastVoteCommandSchema = ResolutionCommandBase.extend({
  vote: VoteSchema,
});

export const ResolutionCommandSchemas = {
  Propose: ProposeResolutionCommandSchema,
  Update: UpdateResolutionCommandSchema,
  Withdraw: WithdrawResolutionCommandSchema,
  CastVote: CastVoteCommandSchema,
};

type Infer<T extends z.ZodTypeAny> = z.infer<T>;

export type ProposeResolutionCommand = Infer<typeof ProposeResolutionCommandSchema>;
export type UpdateResolutionCommand = Infer<typeof UpdateResolutionCommandSchema>;
export type WithdrawResolutionCommand = Infer<typeof WithdrawResolutionCommandSchema>;
export type CastVoteCommand = Infer<typeof CastVoteCommandSchema>;

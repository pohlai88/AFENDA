import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardActionItemIdSchema, BoardMinuteIdSchema } from "./minutes.entity.js";
import {
  CreateActionItemCommandFieldsSchema,
  RecordMinutesCommandFieldsSchema,
  UpdateActionItemCommandFieldsSchema,
  withActionItemUpdateRefinement,
  withDueDateFutureRefinement,
} from "./minutes.shared.js";

const MinutesCommandBaseSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

const ActionItemCommandBaseSchema = MinutesCommandBaseSchema.extend({
  // Keep `id` for compatibility with current core service command contract.
  id: BoardActionItemIdSchema,
});

export const RecordMinutesCommandSchema = MinutesCommandBaseSchema.extend({
  meetingId: BoardMeetingIdSchema,
  ...RecordMinutesCommandFieldsSchema.shape,
});

export const CreateActionItemCommandSchema = withDueDateFutureRefinement(
  MinutesCommandBaseSchema.extend({
    minuteId: BoardMinuteIdSchema,
    ...CreateActionItemCommandFieldsSchema.shape,
  }),
);

export const UpdateActionItemCommandSchema = withDueDateFutureRefinement(
  withActionItemUpdateRefinement(
    ActionItemCommandBaseSchema.extend({
      ...UpdateActionItemCommandFieldsSchema.shape,
    }),
  ),
);

export const DeleteActionItemCommandSchema = ActionItemCommandBaseSchema;

export type RecordMinutesCommand = z.infer<typeof RecordMinutesCommandSchema>;
export type CreateActionItemCommand = z.infer<typeof CreateActionItemCommandSchema>;
export type UpdateActionItemCommand = z.infer<typeof UpdateActionItemCommandSchema>;
export type DeleteActionItemCommand = z.infer<typeof DeleteActionItemCommandSchema>;

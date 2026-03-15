import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  MeetingCancellationReasonTextSchema,
  MeetingCommandCreateFieldsSchema,
  MeetingCommandUpdateFieldsSchema,
  MeetingAdjournNoteTextSchema,
  withChairSecretaryRefinement,
  withMeetingLifecycleTextRefinement,
  withMeetingUpdateRefinement,
} from "./meeting.shared.js";

/** Base schema for meeting commands */
const MeetingCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

export const CreateBoardMeetingCommandSchema = withChairSecretaryRefinement(
  MeetingCommandBase.extend({
    ...MeetingCommandCreateFieldsSchema.shape,
  }),
);

export const UpdateBoardMeetingCommandSchema = withChairSecretaryRefinement(
  withMeetingUpdateRefinement(
    MeetingCommandBase.extend({
      meetingId: BoardMeetingIdSchema,
      ...MeetingCommandUpdateFieldsSchema.shape,
    }),
  ),
);

export const DeleteBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
});

export const StartBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
});

export const AdjournBoardMeetingCommandSchema = withMeetingLifecycleTextRefinement(
  MeetingCommandBase.extend({
    meetingId: BoardMeetingIdSchema,
    note: MeetingAdjournNoteTextSchema,
  }),
);

export const CancelBoardMeetingCommandSchema = withMeetingLifecycleTextRefinement(
  MeetingCommandBase.extend({
    meetingId: BoardMeetingIdSchema,
    reason: MeetingCancellationReasonTextSchema,
  }),
);

export const CompleteBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
});

export type CreateBoardMeetingCommand = z.infer<typeof CreateBoardMeetingCommandSchema>;
export type UpdateBoardMeetingCommand = z.infer<typeof UpdateBoardMeetingCommandSchema>;
export type DeleteBoardMeetingCommand = z.infer<typeof DeleteBoardMeetingCommandSchema>;
export type StartBoardMeetingCommand = z.infer<typeof StartBoardMeetingCommandSchema>;
export type AdjournBoardMeetingCommand = z.infer<typeof AdjournBoardMeetingCommandSchema>;
export type CancelBoardMeetingCommand = z.infer<typeof CancelBoardMeetingCommandSchema>;
export type CompleteBoardMeetingCommand = z.infer<typeof CompleteBoardMeetingCommandSchema>;

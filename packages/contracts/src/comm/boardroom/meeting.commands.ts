import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

/** Base schema for meeting commands */
const MeetingCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

export const CreateBoardMeetingCommandSchema = MeetingCommandBase.extend({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10_000).nullable().default(null),
  scheduledAt: z.string().datetime({ offset: true }).nullable().default(null),
  duration: z.number().int().min(0).max(1440).optional().default(60),
  location: z.string().trim().max(300).nullable().default(null),
  chairId: PrincipalIdSchema,
  secretaryId: PrincipalIdSchema.nullable().default(null),
  quorumRequired: z.number().int().min(0).optional().default(1),
}).superRefine((data, ctx) => {
  if (data.secretaryId && data.secretaryId === data.chairId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secretary cannot be the same as Chair.",
      path: ["secretaryId"],
    });
  }
});

export const UpdateBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  duration: z.number().int().min(0).max(1440).optional(),
  location: z.string().trim().max(300).nullable().optional(),
  chairId: PrincipalIdSchema.optional(),
  secretaryId: PrincipalIdSchema.nullable().optional(),
  quorumRequired: z.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.secretaryId && data.chairId && data.secretaryId === data.chairId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secretary cannot be the same as Chair.",
      path: ["secretaryId"],
    });
  }
});

export const DeleteBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
});

export const StartBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
});

export const AdjournBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
  note: z.string().trim().max(1000).optional(),
});

export const CancelBoardMeetingCommandSchema = MeetingCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
  reason: z.string().trim().max(500).optional(),
});

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

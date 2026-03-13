import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  BoardMinuteIdSchema,
  ActionItemStatusSchema,
  BoardActionItemIdSchema,
} from "./minutes.entity.js";
import { BoardResolutionIdSchema } from "./resolution.entity.js";

/** Reusable string schemas */
const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(10_000);
const ContentSchema = z.string().trim().min(1).max(100_000);
const DueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const RecordMinutesCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  meetingId: BoardMeetingIdSchema,
  resolutionId: BoardResolutionIdSchema.nullable().optional().default(null),
  content: ContentSchema,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const CreateActionItemCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    minuteId: BoardMinuteIdSchema,
    title: TitleSchema,
    description: DescriptionSchema.nullable().optional().default(null),
    assigneeId: PrincipalIdSchema.nullable().optional().default(null),
    dueDate: DueDateSchema.nullable().optional().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date must be in the future.",
        path: ["dueDate"],
      });
    }
  });

export const UpdateActionItemCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    id: BoardActionItemIdSchema,
    title: TitleSchema.optional(),
    description: DescriptionSchema.nullable().optional(),
    assigneeId: PrincipalIdSchema.nullable().optional(),
    dueDate: DueDateSchema.nullable().optional(),
    status: ActionItemStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date must be in the future.",
        path: ["dueDate"],
      });
    }
  });

export const DeleteActionItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  id: BoardActionItemIdSchema,
});

export type RecordMinutesCommand = z.infer<typeof RecordMinutesCommandSchema>;
export type CreateActionItemCommand = z.infer<typeof CreateActionItemCommandSchema>;
export type UpdateActionItemCommand = z.infer<typeof UpdateActionItemCommandSchema>;
export type DeleteActionItemCommand = z.infer<typeof DeleteActionItemCommandSchema>;

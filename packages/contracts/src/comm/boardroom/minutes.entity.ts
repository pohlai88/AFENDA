/**
 * Board minutes and action item entity schemas.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardResolutionIdSchema } from "./resolution.entity.js";

/** ID brands */
export const BoardMinuteIdSchema = UuidSchema.brand<"BoardMinuteId">();
export const BoardActionItemIdSchema = UuidSchema.brand<"BoardActionItemId">();

/** Reusable string schemas */
const ContentSchema = z.string().trim().min(1).max(100_000);
const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(10_000);

/** Board Minute */
export const BoardMinuteSchema = z.object({
  id: BoardMinuteIdSchema,
  orgId: OrgIdSchema,
  meetingId: BoardMeetingIdSchema,
  resolutionId: BoardResolutionIdSchema.nullable().default(null),
  createdByPrincipalId: PrincipalIdSchema,
  recordedAt: UtcDateTimeSchema,
  content: ContentSchema,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type BoardMinuteId = z.infer<typeof BoardMinuteIdSchema>;
export type BoardMinute = z.infer<typeof BoardMinuteSchema>;

/** Action Item Status */
export const ActionItemStatusValues = ["open", "in_progress", "done", "cancelled"] as const;

export const ActionItemStatusSchema = z.enum(ActionItemStatusValues);

/** Board Action Item */
export const BoardActionItemSchema = z
  .object({
    id: BoardActionItemIdSchema,
    orgId: OrgIdSchema,
    minuteId: BoardMinuteIdSchema,
    title: TitleSchema,
    description: DescriptionSchema.nullable().default(null),
    assigneeId: PrincipalIdSchema.nullable().default(null),
    dueDate: DateSchema.nullable().default(null),
    status: ActionItemStatusSchema,
    createdByPrincipalId: PrincipalIdSchema,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
    closedAt: UtcDateTimeSchema.nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (["done", "cancelled"].includes(data.status) && !data.closedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closed items must include closedAt.",
        path: ["closedAt"],
      });
    }
    if (data.status === "in_progress" && !data.assigneeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "In-progress items must have an assignee.",
        path: ["assigneeId"],
      });
    }
  });

export type BoardActionItemId = z.infer<typeof BoardActionItemIdSchema>;
export type ActionItemStatus = z.infer<typeof ActionItemStatusSchema>;
export type BoardActionItem = z.infer<typeof BoardActionItemSchema>;

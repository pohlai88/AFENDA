/**
 * Board minutes and action item entity schemas.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  ActionItemAssigneeIdSchema,
  ActionItemDescriptionNullableDefaultSchema,
  ActionItemDueDateNullableDefaultSchema,
  ActionItemStatusSchema,
  ActionItemStatusValues,
  ActionItemTitleSchema,
  MinutesContentSchema,
  MinutesMetadataDefaultSchema,
  MinutesResolutionIdDefaultSchema,
  withActionItemLifecycleRefinement,
} from "./minutes.shared.js";

/** ID brands */
export const BoardMinuteIdSchema = UuidSchema.brand<"BoardMinuteId">();
export const BoardActionItemIdSchema = UuidSchema.brand<"BoardActionItemId">();

/** Board Minute */
export const BoardMinuteSchema = z.object({
  id: BoardMinuteIdSchema,
  orgId: OrgIdSchema,
  meetingId: BoardMeetingIdSchema,
  resolutionId: MinutesResolutionIdDefaultSchema,
  createdByPrincipalId: PrincipalIdSchema,
  recordedAt: UtcDateTimeSchema,
  content: MinutesContentSchema,
  metadata: MinutesMetadataDefaultSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type BoardMinuteId = z.infer<typeof BoardMinuteIdSchema>;
export type BoardMinute = z.infer<typeof BoardMinuteSchema>;

export { ActionItemStatusSchema, ActionItemStatusValues };

/** Board Action Item */
export const BoardActionItemSchema = withActionItemLifecycleRefinement(
  z.object({
    id: BoardActionItemIdSchema,
    orgId: OrgIdSchema,
    minuteId: BoardMinuteIdSchema,
    title: ActionItemTitleSchema,
    description: ActionItemDescriptionNullableDefaultSchema,
    assigneeId: ActionItemAssigneeIdSchema.default(null),
    dueDate: ActionItemDueDateNullableDefaultSchema,
    status: ActionItemStatusSchema,
    createdByPrincipalId: PrincipalIdSchema,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
    closedAt: UtcDateTimeSchema.nullable().default(null),
  }),
);

export type BoardActionItemId = z.infer<typeof BoardActionItemIdSchema>;
export type ActionItemStatus = z.infer<typeof ActionItemStatusSchema>;
export type BoardActionItem = z.infer<typeof BoardActionItemSchema>;

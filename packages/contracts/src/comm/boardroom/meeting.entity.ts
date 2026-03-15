/**
 * Board meeting entity schema.
 *
 * RULES:
 *   1. Use branded IDs from shared/ids.ts.
 *   2. Use UtcDateTimeSchema for timestamps (not z.date()).
 *   3. Export *Values and *Schema separately — *Values is importable by @afenda/db.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  MeetingChairIdSchema,
  MeetingDescriptionSchema,
  MeetingDurationSchema,
  MeetingLocationSchema,
  MeetingNumberSchema,
  MeetingQuorumRequiredSchema,
  MeetingScheduledAtDefaultSchema,
  MeetingSecretaryIdSchema,
  MeetingTitleSchema,
  addChairSecretaryIssue,
  addMeetingStatusIssues,
} from "./meeting.shared.js";

/** ID brand */
export const BoardMeetingIdSchema = UuidSchema.brand<"BoardMeetingId">();

/** Status values */
export const MeetingStatusValues = [
  "draft",
  "scheduled",
  "in_progress",
  "adjourned",
  "completed",
  "cancelled",
] as const;

export const MeetingStatusSchema = z.enum(MeetingStatusValues);

export const BoardMeetingSchema = z
  .object({
    id: BoardMeetingIdSchema,
    orgId: OrgIdSchema,
    meetingNumber: MeetingNumberSchema,
    title: MeetingTitleSchema,
    description: MeetingDescriptionSchema.nullable().default(null),
    status: MeetingStatusSchema,
    scheduledAt: MeetingScheduledAtDefaultSchema,
    duration: MeetingDurationSchema, // minutes, max 24h
    location: MeetingLocationSchema.nullable().default(null),
    chairId: MeetingChairIdSchema,
    secretaryId: MeetingSecretaryIdSchema.default(null),
    quorumRequired: MeetingQuorumRequiredSchema,
    startedAt: UtcDateTimeSchema.nullable().default(null),
    adjournedAt: UtcDateTimeSchema.nullable().default(null),
    createdByPrincipalId: PrincipalIdSchema,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    addChairSecretaryIssue(data, ctx);
    addMeetingStatusIssues(data, ctx);
  });

/** Types */
export type BoardMeetingId = z.infer<typeof BoardMeetingIdSchema>;
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type BoardMeeting = z.infer<typeof BoardMeetingSchema>;

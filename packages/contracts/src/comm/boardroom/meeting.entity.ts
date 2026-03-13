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

/** Reusable string schemas */
const MeetingNumberSchema = z.string().trim().min(1).max(64);
const TitleSchema = z.string().trim().min(1).max(300);
const DescriptionSchema = z.string().trim().max(10_000);
const LocationSchema = z.string().trim().max(300);

export const BoardMeetingSchema = z
  .object({
    id: BoardMeetingIdSchema,
    orgId: OrgIdSchema,
    meetingNumber: MeetingNumberSchema,
    title: TitleSchema,
    description: DescriptionSchema.nullable().default(null),
    status: MeetingStatusSchema,
    scheduledAt: UtcDateTimeSchema.nullable().default(null),
    duration: z.number().int().min(0).max(1440), // minutes, max 24h
    location: LocationSchema.nullable().default(null),
    chairId: PrincipalIdSchema,
    secretaryId: PrincipalIdSchema.nullable().default(null),
    quorumRequired: z.number().int().min(0),
    startedAt: UtcDateTimeSchema.nullable().default(null),
    adjournedAt: UtcDateTimeSchema.nullable().default(null),
    createdByPrincipalId: PrincipalIdSchema,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.secretaryId && data.secretaryId === data.chairId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Secretary cannot be the same as Chair.",
        path: ["secretaryId"],
      });
    }
    if (data.status === "scheduled" && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled meetings must include scheduledAt.",
        path: ["scheduledAt"],
      });
    }
    if (data.status === "in_progress" && !data.startedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meetings in progress must include startedAt.",
        path: ["startedAt"],
      });
    }
    if (data.status === "adjourned" && !data.adjournedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adjourned meetings must include adjournedAt.",
        path: ["adjournedAt"],
      });
    }
  });

/** Types */
export type BoardMeetingId = z.infer<typeof BoardMeetingIdSchema>;
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type BoardMeeting = z.infer<typeof BoardMeetingSchema>;

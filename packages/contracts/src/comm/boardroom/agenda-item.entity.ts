/**
 * Board agenda item entity schema.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

/** ID brand */
export const BoardAgendaItemIdSchema = UuidSchema.brand<"BoardAgendaItemId">();

/** Reusable string schemas */
const TitleSchema = z.string().trim().min(1).max(500);
const DescriptionSchema = z.string().trim().max(10_000);

export const BoardAgendaItemSchema = z
  .object({
    id: BoardAgendaItemIdSchema,
    orgId: OrgIdSchema,
    meetingId: BoardMeetingIdSchema,
    sortOrder: z.number().int().min(0),
    title: TitleSchema,
    description: DescriptionSchema.nullable().default(null),
    presenterId: PrincipalIdSchema.nullable().default(null),
    /** max 8h; must be > 0 when set */
    durationMinutes: z.number().int().min(1).max(480).nullable().default(null),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.presenterId && !data.durationMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agenda items with a presenter must include durationMinutes.",
        path: ["durationMinutes"],
      });
    }
  });

/** Types */
export type BoardAgendaItemId = z.infer<typeof BoardAgendaItemIdSchema>;
export type BoardAgendaItem = z.infer<typeof BoardAgendaItemSchema>;

import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { nullableDefault } from "./schema.helpers.js";

export const MeetingNumberSchema = z.string().trim().min(1).max(64);
export const MeetingTitleSchema = z.string().trim().min(1).max(300);
export const MeetingDescriptionSchema = z.string().trim().max(10_000);
export const MeetingScheduledAtSchema = UtcDateTimeSchema.nullable();
export const MeetingScheduledAtDefaultSchema = nullableDefault(UtcDateTimeSchema);
export const MeetingDurationSchema = z.number().int().min(0).max(1440);
export const MeetingLocationSchema = z.string().trim().max(300);
export const MeetingChairIdSchema = PrincipalIdSchema;
export const MeetingSecretaryIdSchema = PrincipalIdSchema.nullable();
export const MeetingQuorumRequiredSchema = z.number().int().min(0);

export const MeetingAdjournNoteTextSchema = z.string().trim().max(1000);
export const MeetingCancellationReasonTextSchema = z.string().trim().max(500);

export const MeetingAdjournNoteSchema = nullableDefault(MeetingAdjournNoteTextSchema);
export const MeetingCancellationReasonSchema = nullableDefault(MeetingCancellationReasonTextSchema);

export const MeetingCommandCreateFieldsSchema = z.object({
  title: MeetingTitleSchema,
  description: nullableDefault(MeetingDescriptionSchema),
  scheduledAt: MeetingScheduledAtDefaultSchema,
  duration: MeetingDurationSchema.default(60),
  location: nullableDefault(MeetingLocationSchema),
  chairId: MeetingChairIdSchema,
  secretaryId: MeetingSecretaryIdSchema.default(null),
  quorumRequired: MeetingQuorumRequiredSchema.default(1),
});

export const MeetingCommandUpdateFieldsSchema = z.object({
  title: MeetingTitleSchema.optional(),
  description: MeetingDescriptionSchema.nullable().optional(),
  scheduledAt: MeetingScheduledAtSchema.optional(),
  duration: MeetingDurationSchema.optional(),
  location: MeetingLocationSchema.nullable().optional(),
  chairId: MeetingChairIdSchema.optional(),
  secretaryId: MeetingSecretaryIdSchema.optional(),
  quorumRequired: MeetingQuorumRequiredSchema.optional(),
});

export const MeetingUpdateFieldKeys = [
  "title",
  "description",
  "scheduledAt",
  "duration",
  "location",
  "chairId",
  "secretaryId",
  "quorumRequired",
] as const;

export type MeetingChairSecretaryData = {
  chairId?: string;
  secretaryId?: string | null;
};

export type MeetingUpdateFieldsData = {
  title?: string;
  description?: string | null;
  scheduledAt?: string | null;
  duration?: number;
  location?: string | null;
  chairId?: string;
  secretaryId?: string | null;
  quorumRequired?: number;
};

export type MeetingStatusRefinementData = {
  status?: "draft" | "scheduled" | "in_progress" | "adjourned" | "completed" | "cancelled";
  scheduledAt?: string | null;
  startedAt?: string | null;
  adjournedAt?: string | null;
};

export type MeetingLifecycleTextData = {
  note?: string | null;
  reason?: string | null;
};

export function addChairSecretaryIssue(
  data: MeetingChairSecretaryData,
  ctx: z.RefinementCtx,
): void {
  if (data.secretaryId && data.chairId && data.secretaryId === data.chairId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secretary cannot be the same as Chair.",
      path: ["secretaryId"],
    });
  }
}

export function addMeetingUpdateIssue(data: MeetingUpdateFieldsData, ctx: z.RefinementCtx): void {
  if (MeetingUpdateFieldKeys.every((key) => data[key] === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
}

export function addMeetingStatusIssues(
  data: MeetingStatusRefinementData,
  ctx: z.RefinementCtx,
): void {
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
}

export function addMeetingLifecycleTextIssues(
  data: MeetingLifecycleTextData,
  ctx: z.RefinementCtx,
): void {
  if (data.note !== undefined && data.note !== null && data.note.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Adjourn note cannot be empty.",
      path: ["note"],
    });
  }
  if (data.reason !== undefined && data.reason !== null && data.reason.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cancellation reason cannot be empty.",
      path: ["reason"],
    });
  }
}

export function withChairSecretaryRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addChairSecretaryIssue(data as MeetingChairSecretaryData, ctx);
  }) as T;
}

export function withMeetingUpdateRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addMeetingUpdateIssue(data as MeetingUpdateFieldsData, ctx);
  }) as T;
}

export function withMeetingStatusRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addMeetingStatusIssues(data as MeetingStatusRefinementData, ctx);
  }) as T;
}

export function withMeetingLifecycleTextRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addMeetingLifecycleTextIssues(data as MeetingLifecycleTextData, ctx);
  }) as T;
}

import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardResolutionIdSchema } from "./resolution.entity.js";
import { composeRefinements, nullableDefault } from "./schema.helpers.js";

export const ActionItemTitleSchema = z.string().trim().min(1).max(500);
export const ActionItemDescriptionSchema = z.string().trim().max(10_000);
export const MinutesContentSchema = z.string().trim().min(1).max(100_000);
export const ActionItemStatusValues = ["open", "in_progress", "done", "cancelled"] as const;
export type ActionItemStatus = (typeof ActionItemStatusValues)[number];
export const ActionItemStatusSchema = z.enum(ActionItemStatusValues);

export const ActionItemDueDateSchema = DateSchema;
export const ActionItemAssigneeIdSchema = PrincipalIdSchema.nullable();
export const MinutesResolutionIdSchema = BoardResolutionIdSchema.nullable();
export const MinutesResolutionIdNullableDefaultSchema = nullableDefault(BoardResolutionIdSchema);
export const MinutesResolutionIdDefaultSchema = MinutesResolutionIdNullableDefaultSchema;
export const ActionItemDescriptionNullableSchema = ActionItemDescriptionSchema.nullable();
export const ActionItemDescriptionNullableDefaultSchema = nullableDefault(
  ActionItemDescriptionSchema,
);
export const ActionItemAssigneeIdDefaultSchema = nullableDefault(PrincipalIdSchema);
export const ActionItemDueDateNullableSchema = ActionItemDueDateSchema.nullable();
export const ActionItemDueDateNullableDefaultSchema = nullableDefault(ActionItemDueDateSchema);
export const ActionItemStatusNullableSchema = ActionItemStatusSchema.nullable();
export const ActionItemStatusNullableDefaultSchema = nullableDefault(ActionItemStatusSchema);
export const MinutesMetadataSchema = z.record(z.string(), z.unknown());
export const MinutesMetadataDefaultSchema = MinutesMetadataSchema.default({});

export const RecordMinutesCommandFieldsSchema = z.object({
  resolutionId: MinutesResolutionIdDefaultSchema.optional().default(null),
  content: MinutesContentSchema,
  metadata: MinutesMetadataDefaultSchema.optional().default({}),
});

export const CreateActionItemCommandFieldsSchema = z.object({
  title: ActionItemTitleSchema,
  description: ActionItemDescriptionNullableDefaultSchema.optional().default(null),
  assigneeId: ActionItemAssigneeIdDefaultSchema.optional().default(null),
  dueDate: ActionItemDueDateNullableDefaultSchema.optional().default(null),
});

export const UpdateActionItemCommandFieldsSchema = z.object({
  title: ActionItemTitleSchema.optional(),
  description: ActionItemDescriptionNullableSchema.optional(),
  assigneeId: ActionItemAssigneeIdSchema.optional(),
  dueDate: ActionItemDueDateNullableSchema.optional(),
  status: ActionItemStatusSchema.optional(),
});

export type ActionItemDueDateData = {
  dueDate?: string | null;
};

export type ActionItemUpdateFieldsData = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  status?: ActionItemStatus | null;
};

export type ActionItemLifecycleRefinementData = {
  status?: ActionItemStatus | null;
  assigneeId?: string | null;
  closedAt?: string | null;
};

export function addDueDateFutureIssue(data: ActionItemDueDateData, ctx: z.RefinementCtx): void {
  if (data.dueDate && new Date(data.dueDate) < new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Due date must be in the future.",
      path: ["dueDate"],
    });
  }
}

export function addActionItemUpdateIssue(
  data: ActionItemUpdateFieldsData,
  ctx: z.RefinementCtx,
): void {
  const hasAnyUpdateField =
    data.title !== undefined ||
    data.description !== undefined ||
    data.assigneeId !== undefined ||
    data.dueDate !== undefined ||
    (data.status !== undefined && data.status !== null);

  if (!hasAnyUpdateField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
}

export function addActionItemLifecycleIssues(
  data: ActionItemLifecycleRefinementData,
  ctx: z.RefinementCtx,
): void {
  if (!data.status) {
    return;
  }

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
}

export const addActionItemLifecycleIssue = addActionItemLifecycleIssues;

export function withDueDateFutureRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addDueDateFutureIssue(data as ActionItemDueDateData, ctx);
  }) as T;
}

export function withActionItemUpdateRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addActionItemUpdateIssue(data as ActionItemUpdateFieldsData, ctx);
  }) as T;
}

export function withActionItemLifecycleRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    addActionItemLifecycleIssues(data as ActionItemLifecycleRefinementData, ctx);
  }) as T;
}

export function withActionItemRefinements<T extends z.ZodTypeAny>(schema: T): T {
  return composeRefinements(schema, [
    withActionItemUpdateRefinement,
    withActionItemLifecycleRefinement,
  ]);
}

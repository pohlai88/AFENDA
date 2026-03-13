import { z } from "zod";
import {
  CommTaskIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskChecklistItemIdSchema,
} from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ─── ID Brand ────────────────────────────────────────────────────────────────

// ─── Reusable Field Schema ────────────────────────────────────────────────────

const TextSchema = z.string().trim().min(1).max(500);

// ─── Entity ───────────────────────────────────────────────────────────────────

export const TaskChecklistItemSchema = z
  .object({
    id: TaskChecklistItemIdSchema,
    orgId: OrgIdSchema,
    taskId: CommTaskIdSchema,
    text: TextSchema,
    isChecked: z.boolean(),
    checkedAt: UtcDateTimeSchema.nullable().default(null),
    checkedByPrincipalId: PrincipalIdSchema.nullable().default(null),
    sortOrder: z.number().int().min(0),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.isChecked) {
      if (data.checkedAt === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "checkedAt is required when isChecked is true.",
          path: ["checkedAt"],
        });
      }
      if (data.checkedByPrincipalId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "checkedByPrincipalId is required when isChecked is true.",
          path: ["checkedByPrincipalId"],
        });
      }
    }
  });

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskChecklistItemId = z.infer<typeof TaskChecklistItemIdSchema>;
export type TaskChecklistItem = z.infer<typeof TaskChecklistItemSchema>;

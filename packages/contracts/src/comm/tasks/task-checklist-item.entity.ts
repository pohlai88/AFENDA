import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema } from "./task.entity.js";

export const TaskChecklistItemIdSchema = UuidSchema.brand<"TaskChecklistItemId">();

export const TaskChecklistItemSchema = z.object({
  id: TaskChecklistItemIdSchema,
  orgId: OrgIdSchema,
  taskId: CommTaskIdSchema,
  text: z.string().trim().min(1).max(500),
  isChecked: z.boolean(),
  checkedAt: UtcDateTimeSchema.nullable(),
  checkedByPrincipalId: PrincipalIdSchema.nullable(),
  sortOrder: z.number().int(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type TaskChecklistItemId = z.infer<typeof TaskChecklistItemIdSchema>;
export type TaskChecklistItem = z.infer<typeof TaskChecklistItemSchema>;

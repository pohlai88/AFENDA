import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { CommTaskIdSchema } from "./task.entity.js";

export const TaskTimeEntryIdSchema = UuidSchema.brand<"TaskTimeEntryId">();

export const TaskTimeEntrySchema = z.object({
  id: TaskTimeEntryIdSchema,
  orgId: OrgIdSchema,
  taskId: CommTaskIdSchema,
  principalId: PrincipalIdSchema,
  minutes: z.number().int().positive(),
  entryDate: DateSchema,
  description: z.string().trim().max(2_000).nullable(),
  createdAt: UtcDateTimeSchema,
});

export type TaskTimeEntryId = z.infer<typeof TaskTimeEntryIdSchema>;
export type TaskTimeEntry = z.infer<typeof TaskTimeEntrySchema>;

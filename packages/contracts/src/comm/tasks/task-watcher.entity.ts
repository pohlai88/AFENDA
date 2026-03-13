import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { CommTaskIdSchema } from "./task.entity.js";

export const TaskWatcherIdSchema = UuidSchema.brand<"TaskWatcherId">();

export const TaskWatcherSchema = z.object({
  id: TaskWatcherIdSchema,
  orgId: OrgIdSchema,
  taskId: CommTaskIdSchema,
  principalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
});

export type TaskWatcherId = z.infer<typeof TaskWatcherIdSchema>;
export type TaskWatcher = z.infer<typeof TaskWatcherSchema>;

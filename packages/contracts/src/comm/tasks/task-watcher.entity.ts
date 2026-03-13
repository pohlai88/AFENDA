import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  CommTaskIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskWatcherIdSchema,
} from "../../shared/ids.js";

// ─── ID Brand ────────────────────────────────────────────────────────────────

// ─── Entity ───────────────────────────────────────────────────────────────────

export const TaskWatcherSchema = z.object({
  id: TaskWatcherIdSchema,
  orgId: OrgIdSchema,
  taskId: CommTaskIdSchema,
  principalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskWatcherId = z.infer<typeof TaskWatcherIdSchema>;
export type TaskWatcher = z.infer<typeof TaskWatcherSchema>;

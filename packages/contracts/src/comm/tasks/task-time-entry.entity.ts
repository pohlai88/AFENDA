import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  CommTaskIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskTimeEntryIdSchema,
} from "../../shared/ids.js";

// ─── ID Brand ────────────────────────────────────────────────────────────────

// ─── Entity ───────────────────────────────────────────────────────────────────

export const TaskTimeEntrySchema = z.object({
  id: TaskTimeEntryIdSchema,
  orgId: OrgIdSchema,
  taskId: CommTaskIdSchema,
  principalId: PrincipalIdSchema,
  minutes: z.number().int().positive(),
  entryDate: DateSchema,
  description: z.string().trim().max(2_000).nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskTimeEntryId = z.infer<typeof TaskTimeEntryIdSchema>;
export type TaskTimeEntry = z.infer<typeof TaskTimeEntrySchema>;

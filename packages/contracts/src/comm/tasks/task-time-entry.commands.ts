import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema } from "./task.entity.js";

export const LogTaskTimeEntryCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  taskId: CommTaskIdSchema,
  minutes: z.number().int().positive(),
  entryDate: DateSchema,
  description: z.string().trim().max(2_000).optional(),
});

export type LogTaskTimeEntryCommand = z.infer<typeof LogTaskTimeEntryCommandSchema>;

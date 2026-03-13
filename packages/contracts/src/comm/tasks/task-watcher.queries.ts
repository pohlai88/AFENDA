import { z } from "zod";
import { CommTaskIdSchema, PrincipalIdSchema, TaskWatcherIdSchema } from "../../shared/ids.js";
import {
  CommSummaryGroupSchema,
  makeCommListResponseSchema,
  makeCommSummaryResponseSchema,
} from "../shared/response.js";
import { TaskWatcherSchema } from "./task-watcher.entity.js";

export const ListTaskWatchersQuerySchema = z.object({
  taskId: CommTaskIdSchema,
});

export const GetTaskWatcherQuerySchema = z.object({
  taskId: CommTaskIdSchema,
  watcherId: TaskWatcherIdSchema,
});

export const SummarizeTaskWatchersQuerySchema = z.object({
  taskId: CommTaskIdSchema.optional(),
  principalId: PrincipalIdSchema.optional(),
  groupBy: z.enum(["task", "principal"]).optional(),
});

export const SummarizeTaskWatchersDataSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  groups: z.array(CommSummaryGroupSchema),
});

export const ListTaskWatchersResponseSchema = makeCommListResponseSchema(TaskWatcherSchema);
export const SummarizeTaskWatchersResponseSchema = makeCommSummaryResponseSchema(
  SummarizeTaskWatchersDataSchema,
);

export type ListTaskWatchersQuery = z.infer<typeof ListTaskWatchersQuerySchema>;
export type GetTaskWatcherQuery = z.infer<typeof GetTaskWatcherQuerySchema>;
export type SummarizeTaskWatchersQuery = z.infer<typeof SummarizeTaskWatchersQuerySchema>;
export type ListTaskWatchersResponse = z.infer<typeof ListTaskWatchersResponseSchema>;
export type SummarizeTaskWatchersData = z.infer<typeof SummarizeTaskWatchersDataSchema>;
export type SummarizeTaskWatchersResponse = z.infer<typeof SummarizeTaskWatchersResponseSchema>;

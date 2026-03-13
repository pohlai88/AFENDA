import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema, EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import {
  CommSummaryGroupSchema,
  makeCommListResponseSchema,
  makeCommSearchResponseSchema,
  makeCommSummaryResponseSchema,
} from "../shared/response.js";
import { TaskPrioritySchema, TaskSchema, TaskStatusSchema, TaskTypeSchema } from "./task.entity.js";

const ContextEntityTypeSchema = z.string().trim().min(1).max(128);

export const GetTaskQuerySchema = z.object({
  taskId: CommTaskIdSchema,
});

export const ListTasksQuerySchema = z
  .object({
    projectId: CommProjectIdSchema.optional(),
    assigneeId: PrincipalIdSchema.optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    taskType: TaskTypeSchema.optional(),
    parentTaskId: CommTaskIdSchema.optional(),
    contextEntityType: ContextEntityTypeSchema.optional(),
    contextEntityId: EntityIdSchema.optional(),
    dueBefore: DateSchema.optional(),
    dueAfter: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: CommTaskIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "dueAfter",
      toKey: "dueBefore",
      message: "dueBefore must be on or after dueAfter.",
      path: ["dueBefore"],
    });
  });

export const SearchTasksQuerySchema = z.object({
  query: CommQueryTextSchema,
  projectId: CommProjectIdSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  status: TaskStatusSchema.optional(),
  limit: CommSearchLimitSchema,
});

export const SummarizeTasksQuerySchema = z.object({
  projectId: CommProjectIdSchema.optional(),
  assigneeId: PrincipalIdSchema.optional(),
  groupBy: z.enum(["status", "priority", "taskType", "assignee"]).optional(),
});

export const SummarizeTasksDataSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  groups: z.array(CommSummaryGroupSchema),
});

export const ListTasksResponseSchema = makeCommListResponseSchema(TaskSchema);
export const SearchTasksResponseSchema = makeCommSearchResponseSchema(TaskSchema);
export const SummarizeTasksResponseSchema = makeCommSummaryResponseSchema(SummarizeTasksDataSchema);

export type GetTaskQuery = z.infer<typeof GetTaskQuerySchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
export type SearchTasksQuery = z.infer<typeof SearchTasksQuerySchema>;
export type SummarizeTasksQuery = z.infer<typeof SummarizeTasksQuerySchema>;
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;
export type SearchTasksResponse = z.infer<typeof SearchTasksResponseSchema>;
export type SummarizeTasksData = z.infer<typeof SummarizeTasksDataSchema>;
export type SummarizeTasksResponse = z.infer<typeof SummarizeTasksResponseSchema>;

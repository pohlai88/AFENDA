import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { CommTaskIdSchema, PrincipalIdSchema, TaskTimeEntryIdSchema } from "../../shared/ids.js";
import { applyDateOrderRefinement, CommListLimitSchema } from "../shared/query.js";
import {
  CommSummaryGroupSchema,
  makeCommDetailResponseSchema,
  makeCommListResponseSchema,
  makeCommSummaryResponseSchema,
} from "../shared/response.js";
import { TaskTimeEntrySchema } from "./task-time-entry.entity.js";

export const ListTaskTimeEntriesQuerySchema = z
  .object({
    taskId: CommTaskIdSchema,
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
    limit: CommListLimitSchema.optional().default(50),
    cursor: TaskTimeEntryIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "toDate must be on or after fromDate.",
    });
  });

export const GetTaskTimeEntryQuerySchema = z.object({
  taskId: CommTaskIdSchema,
  timeEntryId: TaskTimeEntryIdSchema,
});

export const SummarizeTaskTimeEntriesQuerySchema = z
  .object({
    taskId: CommTaskIdSchema.optional(),
    principalId: PrincipalIdSchema.optional(),
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
    groupBy: z.enum(["task", "principal", "date"]).optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "toDate must be on or after fromDate.",
    });
  });

export const SummarizeOrgTimeEntriesQuerySchema = z
  .object({
    principalId: PrincipalIdSchema.optional(),
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
    groupBy: z.enum(["task", "principal", "date"]).optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "toDate must be on or after fromDate.",
    });
  });

export const GetTaskTimeEntryResponseSchema = makeCommDetailResponseSchema(TaskTimeEntrySchema);
export const ListTaskTimeEntriesResponseSchema = makeCommListResponseSchema(TaskTimeEntrySchema);
export const SummarizeTaskTimeEntriesDataSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  totalMinutes: z.number().int().nonnegative(),
  groups: z.array(
    CommSummaryGroupSchema.extend({
      totalMinutes: z.number().int().nonnegative(),
    }),
  ),
});
export const SummarizeOrgTimeEntriesDataSchema = SummarizeTaskTimeEntriesDataSchema;
export const SummarizeTaskTimeEntriesResponseSchema = makeCommSummaryResponseSchema(
  SummarizeTaskTimeEntriesDataSchema,
);
export const SummarizeOrgTimeEntriesResponseSchema = makeCommSummaryResponseSchema(
  SummarizeOrgTimeEntriesDataSchema,
);

export type ListTaskTimeEntriesQuery = z.infer<typeof ListTaskTimeEntriesQuerySchema>;
export type GetTaskTimeEntryQuery = z.infer<typeof GetTaskTimeEntryQuerySchema>;
export type SummarizeTaskTimeEntriesQuery = z.infer<typeof SummarizeTaskTimeEntriesQuerySchema>;
export type SummarizeOrgTimeEntriesQuery = z.infer<typeof SummarizeOrgTimeEntriesQuerySchema>;
export type GetTaskTimeEntryResponse = z.infer<typeof GetTaskTimeEntryResponseSchema>;
export type ListTaskTimeEntriesResponse = z.infer<typeof ListTaskTimeEntriesResponseSchema>;
export type SummarizeTaskTimeEntriesData = z.infer<typeof SummarizeTaskTimeEntriesDataSchema>;
export type SummarizeOrgTimeEntriesData = z.infer<typeof SummarizeOrgTimeEntriesDataSchema>;
export type SummarizeTaskTimeEntriesResponse = z.infer<
  typeof SummarizeTaskTimeEntriesResponseSchema
>;
export type SummarizeOrgTimeEntriesResponse = z.infer<typeof SummarizeOrgTimeEntriesResponseSchema>;

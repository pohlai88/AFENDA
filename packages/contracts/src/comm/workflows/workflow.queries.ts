import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import {
  CommWorkflowIdSchema,
  CommWorkflowRunIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
} from "../shared/query.js";
import {
  CommSummaryGroupSchema,
  makeCommListResponseSchema,
  makeCommSummaryResponseSchema,
} from "../shared/response.js";
import {
  WorkflowRunSchema,
  WorkflowRunStatusValues,
  WorkflowSchema,
  WorkflowStatusValues,
  WorkflowTriggerTypeValues,
} from "./workflow.entity.js";

export const GetWorkflowQuerySchema = z.object({
  orgId: OrgIdSchema,
  workflowId: CommWorkflowIdSchema,
});

export const ListWorkflowsQuerySchema = z.object({
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema.optional(),
  status: z.enum(WorkflowStatusValues).optional(),
  triggerType: z.enum(WorkflowTriggerTypeValues).optional(),
  query: CommQueryTextSchema.optional(),
  limit: CommListLimitSchema,
  cursor: CommWorkflowIdSchema.optional(),
});

export const SummarizeWorkflowsQuerySchema = z.object({
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema.optional(),
  groupBy: z.enum(["status", "triggerType"]).optional(),
});

export const SummarizeWorkflowsDataSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  groups: z.array(CommSummaryGroupSchema),
});

export const GetWorkflowRunQuerySchema = z.object({
  orgId: OrgIdSchema,
  workflowRunId: CommWorkflowRunIdSchema,
});

export const ListWorkflowRunsQuerySchema = z
  .object({
    orgId: OrgIdSchema,
    workflowId: CommWorkflowIdSchema.optional(),
    status: z.enum(WorkflowRunStatusValues).optional(),
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: CommWorkflowRunIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "fromDate must be <= toDate",
    });
  });

export const SummarizeWorkflowRunsQuerySchema = z
  .object({
    orgId: OrgIdSchema,
    workflowId: CommWorkflowIdSchema.optional(),
    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "fromDate",
      toKey: "toDate",
      message: "fromDate must be <= toDate",
    });
  });

export const SummarizeWorkflowRunsDataSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  groups: z.array(CommSummaryGroupSchema),
});

export const ListWorkflowsResponseSchema = makeCommListResponseSchema(WorkflowSchema);
export const ListWorkflowRunsResponseSchema = makeCommListResponseSchema(WorkflowRunSchema);
export const SummarizeWorkflowsResponseSchema = makeCommSummaryResponseSchema(
  SummarizeWorkflowsDataSchema,
);
export const SummarizeWorkflowRunsResponseSchema = makeCommSummaryResponseSchema(
  SummarizeWorkflowRunsDataSchema,
);

export type GetWorkflowQuery = z.infer<typeof GetWorkflowQuerySchema>;
export type ListWorkflowsQuery = z.infer<typeof ListWorkflowsQuerySchema>;
export type SummarizeWorkflowsQuery = z.infer<typeof SummarizeWorkflowsQuerySchema>;
export type GetWorkflowRunQuery = z.infer<typeof GetWorkflowRunQuerySchema>;
export type ListWorkflowRunsQuery = z.infer<typeof ListWorkflowRunsQuerySchema>;
export type SummarizeWorkflowRunsQuery = z.infer<typeof SummarizeWorkflowRunsQuerySchema>;
export type ListWorkflowsResponse = z.infer<typeof ListWorkflowsResponseSchema>;
export type ListWorkflowRunsResponse = z.infer<typeof ListWorkflowRunsResponseSchema>;
export type SummarizeWorkflowsData = z.infer<typeof SummarizeWorkflowsDataSchema>;
export type SummarizeWorkflowRunsData = z.infer<typeof SummarizeWorkflowRunsDataSchema>;
export type SummarizeWorkflowsResponse = z.infer<typeof SummarizeWorkflowsResponseSchema>;
export type SummarizeWorkflowRunsResponse = z.infer<typeof SummarizeWorkflowRunsResponseSchema>;

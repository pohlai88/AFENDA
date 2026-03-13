import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import { makeCommListResponseSchema, makeCommSearchResponseSchema } from "../shared/response.js";
import {
  ApprovalDelegationIdSchema,
  ApprovalDelegationSchema,
  ApprovalPolicyIdSchema,
  ApprovalPolicySchema,
  ApprovalRequestIdSchema,
  ApprovalRequestSchema,
  ApprovalStatusSchema,
  ApprovalStepIdSchema,
  ApprovalStepSchema,
  ApprovalUrgencySchema,
} from "./approval-request.entity.js";

export const GetApprovalRequestQuerySchema = z.object({
  approvalRequestId: ApprovalRequestIdSchema,
});

export const ListApprovalRequestsQuerySchema = z
  .object({
    status: ApprovalStatusSchema.optional(),
    requestedByPrincipalId: PrincipalIdSchema.optional(),
    sourceEntityType: z.string().trim().min(1).max(128).optional(),
    sourceEntityId: EntityIdSchema.optional(),
    urgency: ApprovalUrgencySchema.optional(),
    dueBefore: DateSchema.optional(),
    dueAfter: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: ApprovalRequestIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "dueAfter",
      toKey: "dueBefore",
      message: "dueBefore must be on or after dueAfter.",
      path: ["dueBefore"],
    });
  });

export const SearchApprovalRequestsQuerySchema = z.object({
  query: CommQueryTextSchema,
  status: ApprovalStatusSchema.optional(),
  requestedByPrincipalId: PrincipalIdSchema.optional(),
  urgency: ApprovalUrgencySchema.optional(),
  limit: CommSearchLimitSchema,
});

export const ListApprovalStepsQuerySchema = z.object({
  approvalRequestId: ApprovalRequestIdSchema,
  status: z.enum(["pending", "approved", "rejected", "skipped", "delegated"]).optional(),
  assigneeId: PrincipalIdSchema.optional(),
  limit: CommListLimitSchema,
  cursor: ApprovalStepIdSchema.optional(),
});

export const GetApprovalPolicyQuerySchema = z.object({
  approvalPolicyId: ApprovalPolicyIdSchema,
});

export const ListApprovalPoliciesQuerySchema = z.object({
  sourceEntityType: z.string().trim().min(1).max(128).optional(),
  isActive: z.boolean().optional(),
  query: CommQueryTextSchema.optional(),
  limit: CommListLimitSchema,
  cursor: ApprovalPolicyIdSchema.optional(),
});

export const ListApprovalDelegationsQuerySchema = z
  .object({
    fromPrincipalId: PrincipalIdSchema.optional(),
    toPrincipalId: PrincipalIdSchema.optional(),
    activeOnDate: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: ApprovalDelegationIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.fromPrincipalId && !data.toPrincipalId && !data.activeOnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one filter to scope delegation queries.",
        path: [],
      });
    }
  });

export const ListApprovalRequestsResponseSchema = makeCommListResponseSchema(ApprovalRequestSchema);
export const SearchApprovalRequestsResponseSchema =
  makeCommSearchResponseSchema(ApprovalRequestSchema);
export const ListApprovalStepsResponseSchema = makeCommListResponseSchema(ApprovalStepSchema);
export const ListApprovalPoliciesResponseSchema = makeCommListResponseSchema(ApprovalPolicySchema);
export const ListApprovalDelegationsResponseSchema =
  makeCommListResponseSchema(ApprovalDelegationSchema);

export type GetApprovalRequestQuery = z.infer<typeof GetApprovalRequestQuerySchema>;
export type ListApprovalRequestsQuery = z.infer<typeof ListApprovalRequestsQuerySchema>;
export type SearchApprovalRequestsQuery = z.infer<typeof SearchApprovalRequestsQuerySchema>;
export type ListApprovalStepsQuery = z.infer<typeof ListApprovalStepsQuerySchema>;
export type GetApprovalPolicyQuery = z.infer<typeof GetApprovalPolicyQuerySchema>;
export type ListApprovalPoliciesQuery = z.infer<typeof ListApprovalPoliciesQuerySchema>;
export type ListApprovalDelegationsQuery = z.infer<typeof ListApprovalDelegationsQuerySchema>;
export type ListApprovalRequestsResponse = z.infer<typeof ListApprovalRequestsResponseSchema>;
export type SearchApprovalRequestsResponse = z.infer<typeof SearchApprovalRequestsResponseSchema>;
export type ListApprovalStepsResponse = z.infer<typeof ListApprovalStepsResponseSchema>;
export type ListApprovalPoliciesResponse = z.infer<typeof ListApprovalPoliciesResponseSchema>;
export type ListApprovalDelegationsResponse = z.infer<typeof ListApprovalDelegationsResponseSchema>;

import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import {
  commApprovalRequest,
  commApprovalStep,
  commApprovalPolicy,
  commApprovalDelegation,
  commApprovalStatusHistory,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  ApprovalRequestId,
  ApprovalStepId,
  ApprovalPolicyId,
  ApprovalDelegationId,
  ApprovalStatus,
  CreateApprovalRequestCommand,
  ApproveStepCommand,
  RejectStepCommand,
  DelegateStepCommand,
  EscalateApprovalCommand,
  WithdrawApprovalCommand,
  CreateApprovalPolicyCommand,
  SetDelegationCommand,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";

export interface CommApprovalPolicyContext {
  principalId: PrincipalId | null;
}

export type CommApprovalServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommApprovalServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommApprovalServiceError };

function buildApprovalNumber(): string {
  return `APR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function requirePrincipal(
  policyCtx: CommApprovalPolicyContext,
): CommApprovalServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

async function loadApprovalRequest(
  db: DbClient,
  orgId: string,
  approvalRequestId: ApprovalRequestId,
) {
  const [row] = await db
    .select()
    .from(commApprovalRequest)
    .where(
      and(eq(commApprovalRequest.orgId, orgId), eq(commApprovalRequest.id, approvalRequestId)),
    );
  return row ?? null;
}

async function loadApprovalStep(db: DbClient, orgId: string, stepId: ApprovalStepId) {
  const [row] = await db
    .select()
    .from(commApprovalStep)
    .where(and(eq(commApprovalStep.orgId, orgId), eq(commApprovalStep.id, stepId)));
  return row ?? null;
}

// ── createApprovalRequest ─────────────────────────────────────────────────────

export async function createApprovalRequest(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: CreateApprovalRequestCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalRequestId; approvalNumber: string }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const approvalNumber = buildApprovalNumber();
  const totalSteps = params.steps.length;

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.requested" as const,
      entityType: "approval_request" as const,
      correlationId,
      details: { approvalNumber, title: params.title, sourceEntityType: params.sourceEntityType },
    },
    async (tx) => {
      const [request] = await tx
        .insert(commApprovalRequest)
        .values({
          orgId,
          approvalNumber,
          title: params.title,
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          requestedByPrincipalId: principalId,
          status: "pending",
          currentStepIndex: 0,
          totalSteps,
          urgency: params.urgency ?? "normal",
          dueDate: params.dueDate ?? null,
        })
        .returning({
          id: commApprovalRequest.id,
          approvalNumber: commApprovalRequest.approvalNumber,
        });

      if (!request) throw new Error("Failed to create approval request");

      await tx.insert(commApprovalStep).values(
        params.steps.map((step, i) => ({
          orgId,
          approvalRequestId: request.id,
          stepIndex: i,
          label: step.label ?? null,
          assigneeId: step.assigneeId,
          status: "pending" as const,
        })),
      );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.APPROVAL_REQUESTED",
        version: "1",
        correlationId,
        payload: {
          approvalRequestId: request.id,
          approvalNumber: request.approvalNumber,
          title: params.title,
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          totalSteps,
        },
      });

      return request;
    },
  );

  return {
    ok: true,
    data: {
      id: result.id as ApprovalRequestId,
      approvalNumber: result.approvalNumber,
    },
  };
}

// ── approveStep ───────────────────────────────────────────────────────────────

export async function approveStep(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: ApproveStepCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalRequestId; status: ApprovalStatus }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const request = await loadApprovalRequest(db, orgId, params.approvalRequestId);
  if (!request) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_ALREADY_RESOLVED",
        message: "Approval request is already resolved",
        meta: { status: request.status },
      },
    };
  }

  const step = await loadApprovalStep(db, orgId, params.stepId);
  if (!step || step.approvalRequestId !== request.id) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_STEP_NOT_FOUND", message: "Approval step not found" },
    };
  }

  if (step.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_STEP_NOT_PENDING",
        message: "Step is not in pending state",
        meta: { stepStatus: step.status },
      },
    };
  }

  // Actor must be the assignee or delegate
  const effectiveAssignee = step.delegatedToId ?? step.assigneeId;
  if (effectiveAssignee !== principalId) {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR",
        message: "You are not assigned to this step",
      },
    };
  }

  const isLastStep = step.stepIndex === request.totalSteps - 1;
  const nextStatus: ApprovalStatus = isLastStep ? "approved" : "pending";
  const nextStepIndex = isLastStep ? request.currentStepIndex : request.currentStepIndex + 1;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.step_approved" as const,
      entityType: "approval_request" as const,
      entityId: request.id as unknown as EntityId,
      correlationId,
      details: {
        approvalRequestId: request.id,
        stepId: step.id,
        stepIndex: String(step.stepIndex),
        isLastStep: String(isLastStep),
      },
    },
    async (tx) => {
      await tx
        .update(commApprovalStep)
        .set({
          status: "approved",
          comment: params.comment ?? null,
          actedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(commApprovalStep.id, step.id));

      if (isLastStep) {
        await tx
          .update(commApprovalRequest)
          .set({
            status: "approved",
            resolvedAt: sql`now()`,
            resolvedByPrincipalId: principalId,
            updatedAt: sql`now()`,
          })
          .where(eq(commApprovalRequest.id, request.id));

        await tx.insert(commApprovalStatusHistory).values({
          orgId,
          approvalRequestId: request.id,
          fromStatus: "pending",
          toStatus: "approved",
          changedByPrincipalId: principalId,
        });

        await tx.insert(outboxEvent).values({
          orgId,
          type: "COMM.APPROVAL_APPROVED",
          version: "1",
          correlationId,
          payload: {
            approvalRequestId: request.id,
            approvalNumber: request.approvalNumber,
            sourceEntityType: request.sourceEntityType,
            sourceEntityId: request.sourceEntityId,
          },
        });
      } else {
        await tx
          .update(commApprovalRequest)
          .set({ currentStepIndex: nextStepIndex, updatedAt: sql`now()` })
          .where(eq(commApprovalRequest.id, request.id));

        await tx.insert(outboxEvent).values({
          orgId,
          type: "COMM.APPROVAL_STEP_APPROVED",
          version: "1",
          correlationId,
          payload: {
            approvalRequestId: request.id,
            stepId: step.id,
            stepIndex: step.stepIndex,
            nextStepIndex,
          },
        });
      }
    },
  );

  return { ok: true, data: { id: request.id as ApprovalRequestId, status: nextStatus } };
}

// ── rejectStep ────────────────────────────────────────────────────────────────

export async function rejectStep(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: RejectStepCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalRequestId; status: ApprovalStatus }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const request = await loadApprovalRequest(db, orgId, params.approvalRequestId);
  if (!request) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_ALREADY_RESOLVED",
        message: "Approval request is already resolved",
        meta: { status: request.status },
      },
    };
  }

  const step = await loadApprovalStep(db, orgId, params.stepId);
  if (!step || step.approvalRequestId !== request.id) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_STEP_NOT_FOUND", message: "Approval step not found" },
    };
  }

  if (step.status !== "pending") {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_STEP_NOT_PENDING", message: "Step is not in pending state" },
    };
  }

  const effectiveAssignee = step.delegatedToId ?? step.assigneeId;
  if (effectiveAssignee !== principalId) {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR",
        message: "You are not assigned to this step",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.step_rejected" as const,
      entityType: "approval_request" as const,
      entityId: request.id as unknown as EntityId,
      correlationId,
      details: { approvalRequestId: request.id, stepId: step.id },
    },
    async (tx) => {
      await tx
        .update(commApprovalStep)
        .set({
          status: "rejected",
          comment: params.comment,
          actedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(commApprovalStep.id, step.id));

      await tx
        .update(commApprovalRequest)
        .set({
          status: "rejected",
          resolvedAt: sql`now()`,
          resolvedByPrincipalId: principalId,
          updatedAt: sql`now()`,
        })
        .where(eq(commApprovalRequest.id, request.id));

      await tx.insert(commApprovalStatusHistory).values({
        orgId,
        approvalRequestId: request.id,
        fromStatus: "pending",
        toStatus: "rejected",
        changedByPrincipalId: principalId,
        reason: params.comment,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.APPROVAL_STEP_REJECTED",
        version: "1",
        correlationId,
        payload: {
          approvalRequestId: request.id,
          approvalNumber: request.approvalNumber,
          sourceEntityType: request.sourceEntityType,
          sourceEntityId: request.sourceEntityId,
          rejectionComment: params.comment,
        },
      });
    },
  );

  return { ok: true, data: { id: request.id as ApprovalRequestId, status: "rejected" } };
}

// ── delegateStep ──────────────────────────────────────────────────────────────

export async function delegateStep(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: DelegateStepCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalStepId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const request = await loadApprovalRequest(db, orgId, params.approvalRequestId);
  if (!request) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_ALREADY_RESOLVED",
        message: "Approval request is already resolved",
      },
    };
  }

  const step = await loadApprovalStep(db, orgId, params.stepId);
  if (!step || step.approvalRequestId !== request.id) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_STEP_NOT_FOUND", message: "Approval step not found" },
    };
  }

  if (step.status !== "pending") {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_STEP_NOT_PENDING", message: "Step is not in pending state" },
    };
  }

  if (step.assigneeId !== principalId) {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR",
        message: "You are not the original assignee of this step",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.step_delegated" as const,
      entityType: "approval_step" as const,
      entityId: step.id as unknown as EntityId,
      correlationId,
      details: {
        approvalRequestId: request.id,
        stepId: step.id,
        delegatedTo: params.delegateToPrincipalId,
      },
    },
    async (tx) => {
      await tx
        .update(commApprovalStep)
        .set({
          delegatedToId: params.delegateToPrincipalId,
          status: "delegated",
          updatedAt: sql`now()`,
        })
        .where(eq(commApprovalStep.id, step.id));

      // Insert a new pending step for the delegate at the same index (replacing)
      await tx.insert(commApprovalStep).values({
        orgId,
        approvalRequestId: request.id,
        stepIndex: step.stepIndex,
        assigneeId: params.delegateToPrincipalId,
        status: "pending",
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.APPROVAL_STEP_DELEGATED",
        version: "1",
        correlationId,
        payload: {
          approvalRequestId: request.id,
          stepId: step.id,
          delegatedFromId: principalId,
          delegatedToId: params.delegateToPrincipalId,
        },
      });
    },
  );

  return { ok: true, data: { id: step.id as ApprovalStepId } };
}

// ── escalateApproval ──────────────────────────────────────────────────────────

export async function escalateApproval(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: EscalateApprovalCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalRequestId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const request = await loadApprovalRequest(db, orgId, params.approvalRequestId);
  if (!request) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_ALREADY_RESOLVED",
        message: "Approval request is already resolved",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.escalated" as const,
      entityType: "approval_request" as const,
      entityId: request.id as unknown as EntityId,
      correlationId,
      details: { approvalRequestId: request.id, reason: params.reason },
    },
    async (tx) => {
      await tx
        .update(commApprovalRequest)
        .set({ status: "escalated", updatedAt: sql`now()` })
        .where(eq(commApprovalRequest.id, request.id));

      await tx.insert(commApprovalStatusHistory).values({
        orgId,
        approvalRequestId: request.id,
        fromStatus: "pending",
        toStatus: "escalated",
        changedByPrincipalId: principalId,
        reason: params.reason,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.APPROVAL_ESCALATED",
        version: "1",
        correlationId,
        payload: {
          approvalRequestId: request.id,
          approvalNumber: request.approvalNumber,
          reason: params.reason,
        },
      });
    },
  );

  return { ok: true, data: { id: request.id as ApprovalRequestId } };
}

// ── withdrawApproval ──────────────────────────────────────────────────────────

export async function withdrawApproval(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: WithdrawApprovalCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalRequestId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const request = await loadApprovalRequest(db, orgId, params.approvalRequestId);
  if (!request) {
    return {
      ok: false,
      error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
    };
  }

  if (request.status !== "pending" && request.status !== "escalated") {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_ALREADY_WITHDRAWN",
        message: "Approval request cannot be withdrawn in its current state",
        meta: { status: request.status },
      },
    };
  }

  // Only the requester or an admin can withdraw
  if (request.requestedByPrincipalId !== principalId) {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_STEP_NOT_ASSIGNED_TO_ACTOR",
        message: "Only the requester can withdraw an approval request",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval.withdrawn" as const,
      entityType: "approval_request" as const,
      entityId: request.id as unknown as EntityId,
      correlationId,
      details: { approvalRequestId: request.id },
    },
    async (tx) => {
      await tx
        .update(commApprovalRequest)
        .set({
          status: "withdrawn",
          resolvedAt: sql`now()`,
          resolvedByPrincipalId: principalId,
          updatedAt: sql`now()`,
        })
        .where(eq(commApprovalRequest.id, request.id));

      await tx.insert(commApprovalStatusHistory).values({
        orgId,
        approvalRequestId: request.id,
        fromStatus: request.status,
        toStatus: "withdrawn",
        changedByPrincipalId: principalId,
        reason: params.reason ?? null,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.APPROVAL_WITHDRAWN",
        version: "1",
        correlationId,
        payload: {
          approvalRequestId: request.id,
          approvalNumber: request.approvalNumber,
          sourceEntityType: request.sourceEntityType,
          sourceEntityId: request.sourceEntityId,
        },
      });
    },
  );

  return { ok: true, data: { id: request.id as ApprovalRequestId } };
}

// ── createApprovalPolicy ──────────────────────────────────────────────────────

export async function createApprovalPolicy(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: CreateApprovalPolicyCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalPolicyId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval_policy.created" as const,
      entityType: "approval_policy" as const,
      correlationId,
      details: { name: params.name, sourceEntityType: params.sourceEntityType },
    },
    async (tx) => {
      const [policy] = await tx
        .insert(commApprovalPolicy)
        .values({
          orgId,
          name: params.name,
          sourceEntityType: params.sourceEntityType,
          autoApproveBelowAmount: params.autoApproveBelowAmount ?? null,
          escalationAfterHours: params.escalationAfterHours ?? null,
          isActive: true,
        })
        .returning({ id: commApprovalPolicy.id });

      if (!policy) throw new Error("Failed to create approval policy");
      return policy;
    },
  );

  return { ok: true, data: { id: result.id as ApprovalPolicyId } };
}

// ── setDelegation ─────────────────────────────────────────────────────────────

export async function setDelegation(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommApprovalPolicyContext,
  correlationId: CorrelationId,
  params: SetDelegationCommand,
): Promise<CommApprovalServiceResult<{ id: ApprovalDelegationId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  if (params.validUntil < params.validFrom) {
    return {
      ok: false,
      error: {
        code: "COMM_APPROVAL_INVALID_DELEGATION_DATES",
        message: "validUntil must be on or after validFrom",
      },
    };
  }

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "approval_delegation.created" as const,
      entityType: "approval_delegation" as const,
      correlationId,
      details: {
        fromPrincipalId: principalId,
        toPrincipalId: params.toPrincipalId,
        validFrom: params.validFrom,
        validUntil: params.validUntil,
      },
    },
    async (tx) => {
      const [delegation] = await tx
        .insert(commApprovalDelegation)
        .values({
          orgId,
          fromPrincipalId: principalId,
          toPrincipalId: params.toPrincipalId,
          validFrom: params.validFrom,
          validUntil: params.validUntil,
          reason: params.reason ?? null,
          isActive: true,
        })
        .returning({ id: commApprovalDelegation.id });

      if (!delegation) throw new Error("Failed to create delegation");
      return delegation;
    },
  );

  return { ok: true, data: { id: result.id as ApprovalDelegationId } };
}

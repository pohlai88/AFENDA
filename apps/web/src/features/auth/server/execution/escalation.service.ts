import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repository = new GovernanceExecutionRepository();

export async function escalateOverdueReview(input: {
  reviewCycleId: string;
  escalationLevel: "manager" | "security_admin" | "internal_audit";
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const [row] = await repository.insertEscalation({
    reviewCycleId: input.reviewCycleId,
    escalationLevel: input.escalationLevel,
    reason: input.reason,
    status: "open",
    metadata: input.metadata ?? null,
  });

  return row;
}

export async function dispatchOverdueEscalations() {
  // Scaffold:
  // 1. find overdue review cycles
  // 2. create escalation rows
  // 3. notify escalation targets
  return { ok: true };
}

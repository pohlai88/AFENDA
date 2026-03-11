import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repository = new GovernanceExecutionRepository();

export async function resolveApprovalRequirements(input: {
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  reviewType: string;
}) {
  const rows = await repository.listApprovalMatrix();

  const match = rows.find(
    (row) =>
      row.framework === input.framework &&
      row.reviewType === input.reviewType,
  );

  return (
    match ?? {
      framework: input.framework,
      reviewType: input.reviewType,
      minApprovals: 1,
      requiredRoles: ["admin"],
      escalationRole: "internal_audit",
      metadata: null,
    }
  );
}

export async function evaluateApprovalDecision(input: {
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  reviewType: string;
  approverRoles: string[];
}) {
  const requirements = await resolveApprovalRequirements(input);

  const satisfiedRoles = requirements.requiredRoles.filter((role) =>
    input.approverRoles.includes(role),
  );

  return {
    approved: satisfiedRoles.length >= requirements.minApprovals,
    minApprovals: requirements.minApprovals,
    requiredRoles: requirements.requiredRoles,
    escalationRole: requirements.escalationRole,
  };
}

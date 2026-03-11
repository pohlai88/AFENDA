import { AuthComplianceRepository } from "./compliance.repository";

const repository = new AuthComplianceRepository();

export async function createReviewAttestation(input: {
  reviewType: string;
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  relatedEntityType: string;
  relatedEntityId: string;
  attestedBy: string;
  statement: string;
  outcome: "accepted" | "rejected" | "exception_noted";
  metadata?: Record<string, unknown>;
}) {
  return repository.insertAttestation({
    reviewType: input.reviewType,
    framework: input.framework,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    attestedBy: input.attestedBy,
    statement: input.statement,
    outcome: input.outcome,
    metadata: input.metadata ?? null,
  });
}

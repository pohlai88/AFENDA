import { AuthComplianceRepository } from "./compliance.repository";

const repository = new AuthComplianceRepository();

export async function recordChainOfCustodyEvent(input: {
  evidenceType: string;
  evidenceId: string;
  action: string;
  actorUserId?: string;
  actorRole?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  return repository.insertChainOfCustody({
    evidenceType: input.evidenceType,
    evidenceId: input.evidenceId,
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    note: input.note ?? null,
    metadata: input.metadata ?? null,
  });
}

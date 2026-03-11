import { AuthComplianceRepository } from "./compliance.repository";
import { recordChainOfCustodyEvent } from "./chain-of-custody.service";
import { hashEvidencePayload, signEvidencePayload } from "./export-signing.service";
import { computeEvidenceExpiryDate } from "./retention.service";
import type { AuthControlDefinition } from "./compliance.types";

const repository = new AuthComplianceRepository();

export const AUTH_CONTROL_DEFINITIONS: readonly AuthControlDefinition[] = [
  {
    code: "AUTH-CTRL-001",
    name: "Failed sign-in volume review",
    description:
      "Review elevated failed sign-in activity over the last 24 hours.",
    framework: "SOX",
    frequency: "daily",
    ownerRole: "security_admin",
  },
  {
    code: "AUTH-CTRL-002",
    name: "MFA challenge failure review",
    description:
      "Review repeated MFA verification failures and lockout conditions.",
    framework: "ISO27001",
    frequency: "daily",
    ownerRole: "security_admin",
  },
  {
    code: "AUTH-CTRL-003",
    name: "Audit outbox delivery health",
    description: "Review failed or stuck auth audit events awaiting delivery.",
    framework: "SOX",
    frequency: "daily",
    ownerRole: "platform_admin",
  },
  {
    code: "AUTH-CTRL-004",
    name: "Expired challenge purge compliance",
    description:
      "Confirm expired auth challenges are purged according to retention rules.",
    framework: "ISO27001",
    frequency: "weekly",
    ownerRole: "platform_admin",
  },
  {
    code: "AUTH-CTRL-005",
    name: "Privileged security review attestation",
    description:
      "Quarterly attestation that security incidents and auth exceptions were reviewed.",
    framework: "SOX",
    frequency: "quarterly",
    ownerRole: "internal_audit",
  },
] as const;

export async function createSignedAuthEvidenceExport(input: {
  exportType: string;
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  jurisdiction: string;
  createdBy: string;
  payload: Record<string, unknown>;
}) {
  const payloadString = JSON.stringify(input.payload, null, 2);
  const fileHash = hashEvidencePayload(payloadString);
  const signature = signEvidencePayload(payloadString);
  const expiresAt = computeEvidenceExpiryDate({
    jurisdiction: input.jurisdiction,
    evidenceType: input.exportType,
  });

  const row = await repository.insertEvidenceExport({
    exportType: input.exportType,
    framework: input.framework,
    status: "signed",
    fileName: `${input.exportType}-${Date.now()}.json`,
    fileHash,
    signature,
    signedAt: new Date(),
    expiresAt,
    createdBy: input.createdBy,
    metadata: {
      jurisdiction: input.jurisdiction,
    },
  });

  if (!row) throw new Error("Evidence export insert failed");

  await recordChainOfCustodyEvent({
    evidenceType: "auth_evidence_export",
    evidenceId: row.id,
    action: "generated_and_signed",
    actorUserId: input.createdBy,
    metadata: {
      exportType: input.exportType,
      framework: input.framework,
      fileHash,
    },
  });

  return {
    exportRecord: row,
    payload: payloadString,
  };
}

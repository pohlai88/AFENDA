export function resolveRetentionDays(input: {
  jurisdiction: string;
  evidenceType: string;
}): number {
  const { jurisdiction, evidenceType } = input;

  if (jurisdiction === "MY" && evidenceType === "auth_audit") return 2555; // scaffold
  if (jurisdiction === "SG" && evidenceType === "auth_audit") return 2555;
  if (jurisdiction === "EU" && evidenceType === "auth_audit") return 1095;

  return 365;
}

export function computeEvidenceExpiryDate(input: {
  jurisdiction: string;
  evidenceType: string;
  createdAt?: Date;
}): Date {
  const createdAt = input.createdAt ?? new Date();
  const retentionDays = resolveRetentionDays(input);

  return new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

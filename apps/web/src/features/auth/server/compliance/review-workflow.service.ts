import { AuthComplianceRepository } from "./compliance.repository";

const repository = new AuthComplianceRepository();

export async function createAuditReviewCase(input: {
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  title: string;
  description?: string;
  ownerUserId?: string;
  dueAt?: Date;
}) {
  return repository.insertReviewCase({
    framework: input.framework,
    title: input.title,
    description: input.description ?? null,
    ownerUserId: input.ownerUserId ?? null,
    dueAt: input.dueAt ?? null,
  });
}

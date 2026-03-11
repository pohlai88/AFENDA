import { createHash } from "node:crypto";

import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repo = new GovernanceExecutionRepository();

function hashItem(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createEvidencePackageBundle(input: {
  framework: "SOX" | "ISO27001" | "SOC2" | "INTERNAL";
  packageType: string;
  title: string;
  description?: string;
  createdBy: string;
  items: Array<{
    itemType: string;
    itemId: string;
    payload: Record<string, unknown>;
  }>;
}) {
  const [pkg] = await repo.insertEvidencePackage({
    framework: input.framework,
    packageType: input.packageType,
    title: input.title,
    description: input.description ?? null,
    status: "draft",
    createdBy: input.createdBy,
    metadata: {
      itemCount: input.items.length,
    },
  });

  if (!pkg) throw new Error("Evidence package insert failed");

  for (const item of input.items) {
    await repo.insertEvidencePackageItem({
      packageId: pkg.id,
      itemType: item.itemType,
      itemId: item.itemId,
      hash: hashItem(JSON.stringify(item.payload)),
      metadata: {
        snapshot: item.payload,
      },
    });
  }

  return pkg;
}

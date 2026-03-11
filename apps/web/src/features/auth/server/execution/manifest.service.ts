import { createHash } from "node:crypto";

import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repo = new GovernanceExecutionRepository();

function hashManifest(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export async function createImmutableExportManifest(input: {
  packageId: string;
  createdBy: string;
  manifestVersion?: string;
  payload: Record<string, unknown>;
}) {
  const manifestVersion = input.manifestVersion ?? "1.0";
  const payloadString = JSON.stringify(input.payload, null, 2);
  const manifestHash = hashManifest(payloadString);

  const [manifest] = await repo.insertManifest({
    packageId: input.packageId,
    manifestHash,
    manifestVersion,
    immutableSnapshotRef: `manifest://${input.packageId}/${manifestHash}`,
    createdBy: input.createdBy,
    metadata: {
      payload: input.payload,
    },
  });

  return {
    manifest,
    payload: payloadString,
  };
}

import type { Task } from "graphile-worker";
import { handleTreasuryReconciliationEvent } from "./handle-reconciliation";

export const handleReconciliationSuggested: Task = async (payload, helpers) => {
  await handleTreasuryReconciliationEvent(payload, helpers);
};

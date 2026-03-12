import type { Task } from "graphile-worker";
import { handleTreasuryRevaluationEvent } from "./handle-revaluation";

export const handleFxRevaluationRequested: Task = async (payload, helpers) => {
  await handleTreasuryRevaluationEvent(payload, helpers);
};

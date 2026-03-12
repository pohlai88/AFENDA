import type { Task } from "graphile-worker";
import { handleTreasuryBankStatementEvent } from "./handle-bank-statement";

export const handleBankStatementIngested: Task = async (payload, helpers) => {
  await handleTreasuryBankStatementEvent(payload, helpers);
};

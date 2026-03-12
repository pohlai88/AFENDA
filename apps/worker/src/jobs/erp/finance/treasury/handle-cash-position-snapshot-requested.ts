import type { Task } from "graphile-worker";
import { handleTreasuryCashPositionEvent } from "./handle-cash-position";

export const handleCashPositionSnapshotRequested: Task = async (payload, helpers) => {
  await handleTreasuryCashPositionEvent(payload, helpers);
};

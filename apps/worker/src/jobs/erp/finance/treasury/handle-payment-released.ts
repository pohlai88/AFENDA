import type { Task } from "graphile-worker";
import { handleTreasuryPaymentEvent } from "./handle-payment";

export const handlePaymentReleased: Task = async (payload, helpers) => {
  await handleTreasuryPaymentEvent(payload, helpers);
};

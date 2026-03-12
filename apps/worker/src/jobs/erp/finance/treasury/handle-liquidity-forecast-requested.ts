import type { Task } from "graphile-worker";
import { handleTreasuryLiquidityForecastEvent } from "./handle-liquidity-forecast";

export const handleLiquidityForecastRequested: Task = async (payload, helpers) => {
  await handleTreasuryLiquidityForecastEvent(payload, helpers);
};

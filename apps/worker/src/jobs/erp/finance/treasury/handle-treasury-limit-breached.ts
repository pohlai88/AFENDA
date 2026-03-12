import type { Task } from "graphile-worker";

export const handleTreasuryLimitBreached: Task = async (payload, helpers) => {
  const event = payload as {
    orgId: string;
    correlationId: string;
    payload?: {
      treasuryLimitBreachId?: string;
      treasuryLimitId?: string;
      hardBlock?: boolean;
    };
  };

  helpers.logger.info(
    `processed treasury limit breach event: orgId=${event.orgId} breachId=${event.payload?.treasuryLimitBreachId ?? "unknown"} correlationId=${event.correlationId}`,
  );
};

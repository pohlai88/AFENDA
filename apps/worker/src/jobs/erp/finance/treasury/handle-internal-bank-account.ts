import type { Task } from "graphile-worker";

const TREASURY_INTERNAL_BANK_ACCOUNT_EVENTS = [
  "TREAS.INTERNAL_BANK_ACCOUNT_CREATED",
  "TREAS.INTERNAL_BANK_ACCOUNT_ACTIVATED",
  "TREAS.INTERNAL_BANK_ACCOUNT_DEACTIVATED",
] as const;

export const handleTreasuryInternalBankAccountEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_INTERNAL_BANK_ACCOUNT_EVENTS.includes(
      event.type as (typeof TREASURY_INTERNAL_BANK_ACCOUNT_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_internal_bank_account_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury internal bank account event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};

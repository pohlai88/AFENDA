import type { Task } from "graphile-worker";

const TREASURY_BANK_STATEMENT_EVENTS = [
  "TREAS.BANK_STATEMENT_INGESTED",
  "TREAS.BANK_STATEMENT_FAILED",
] as const;

export const handleTreasuryBankStatementEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (!TREASURY_BANK_STATEMENT_EVENTS.includes(event.type as (typeof TREASURY_BANK_STATEMENT_EVENTS)[number])) {
    helpers.logger.warn(
      `handle_treasury_bank_statement_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury bank statement event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};

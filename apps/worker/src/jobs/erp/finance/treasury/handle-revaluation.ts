import type { Task } from "graphile-worker";

const TREASURY_REVALUATION_EVENTS = [
  "TREAS.REVALUATION_EVENT_CREATED",
  "TREAS.REVALUATION_EVENT_STATUS_UPDATED",
] as const;

export const handleTreasuryRevaluationEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_REVALUATION_EVENTS.includes(
      event.type as (typeof TREASURY_REVALUATION_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_revaluation_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  const logger = helpers.logger;

  switch (event.type) {
    case "TREAS.REVALUATION_EVENT_CREATED": {
      logger.info(
        `revaluation event created: eventId=${event.payload.revaluationEventId} fxExposureId=${event.payload.fxExposureId} valuationDate=${event.payload.valuationDate} correlationId=${event.correlationId}`,
      );
      // TODO: Trigger revaluation calculation workflow
      // - Load FX exposure details
      // - Calculate GL impact (debit/credit entries)
      // - Generate provisional journal entry
      // - Transition to 'calculated' state
      break;
    }

    case "TREAS.REVALUATION_EVENT_STATUS_UPDATED": {
      const newStatus = event.payload.newStatus;
      logger.info(
        `revaluation event status updated: eventId=${event.payload.revaluationEventId} newStatus=${newStatus} correlationId=${event.correlationId}`,
      );

      if (newStatus === "posted") {
        // TODO: Post journal entry to GL
        // - Create GL transaction
        // - Update balance sheet accounts (FX gain/loss)
        logger.debug(
          `posting revaluation to GL revaluationEventId=${event.payload.revaluationEventId}`,
        );
      } else if (newStatus === "rolled_back") {
        // TODO: Reverse journal entry
        // - Create reversing entry
        // - Restore prior GL state
        logger.debug(
          `rolling back revaluation revaluationEventId=${event.payload.revaluationEventId}`,
        );
      }
      break;
    }
  }

  logger.info(
    `processed treasury revaluation event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};

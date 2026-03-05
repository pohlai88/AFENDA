/**
 * Worker job: handle journal.reversed event.
 *
 * Triggered when a journal entry reversal is posted to the GL.
 * Sprint 1: logs the event. Future: update related invoice status,
 * trigger balance recalculation, send notifications.
 */
import type { Task } from "graphile-worker";

export const handleJournalReversed: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      journalEntryId: string;
      entryNumber: string;
      reversalOf: string;
    };
  };

  helpers.logger.info(
    `journal reversed: entryId=${event.payload.journalEntryId} ` +
    `number=${event.payload.entryNumber} ` +
    `reversalOf=${event.payload.reversalOf} ` +
    `correlationId=${event.correlationId}`,
  );
};

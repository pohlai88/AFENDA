import { AuthAuditOutboxRepository } from "./audit.repository";

interface AuthAuditSink {
  send(payload: Record<string, unknown>): Promise<void>;
}

class ConsoleAuditSink implements AuthAuditSink {
  async send(payload: Record<string, unknown>): Promise<void> {
    console.info("[auth-audit-dispatch]", JSON.stringify(payload));
  }
}

function getAuditSink(): AuthAuditSink {
  return new ConsoleAuditSink();
}

export async function processAuthAuditOutboxBatch(limit = 50): Promise<void> {
  const repository = new AuthAuditOutboxRepository();
  const sink = getAuditSink();

  const rows = await repository.listClaimable(limit);

  for (const row of rows) {
    const claimed = await repository.claim(row.id);
    if (!claimed) continue;

    try {
      await sink.send(row.payload);
      await repository.markSent(row.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown dispatch failure";

      if (row.attemptCount >= 10) {
        await repository.markDead(row.id, message);
      } else {
        await repository.markFailed(row.id, message, 60);
      }
    }
  }
}

import { publishAuthAuditEvent } from "./audit.helpers";
import { AuthAuditOutboxRepository } from "./audit.repository";

const repository = new AuthAuditOutboxRepository();

export async function retryFailedOutboxEvent(
  eventId: string,
  actorUserId: string,
): Promise<boolean> {
  const ok = await repository.retryFailedEvent(eventId);

  if (ok) {
    await publishAuthAuditEvent("auth.ops.outbox_retry", {
      userId: actorUserId,
      metadata: { eventId },
    });
  }

  return ok;
}

export async function forceDeadLetterOutboxEvent(
  eventId: string,
  actorUserId: string,
  reason?: string,
): Promise<boolean> {
  const event = await repository.getById(eventId);
  if (!event) return false;
  if (event.status === "sent") return false; // cannot dead-letter sent events
  if (event.status === "failed") return true; // already dead, no-op

  await repository.markDead(
    eventId,
    reason ?? `Force dead-letter by operator ${actorUserId}`,
  );

  await publishAuthAuditEvent("auth.ops.outbox_dead_letter", {
    userId: actorUserId,
    metadata: { eventId, reason: reason ?? null },
  });

  return true;
}

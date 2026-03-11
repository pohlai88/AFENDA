import type { AuthAuditEvent } from "./audit.types";
import { AuthAuditOutboxRepository } from "./audit.repository";

export interface AuthAuditService {
  publish(event: AuthAuditEvent): Promise<void>;
}

class OutboxAuthAuditService implements AuthAuditService {
  constructor(private readonly repository: AuthAuditOutboxRepository) {}

  async publish(event: AuthAuditEvent): Promise<void> {
    await this.repository.enqueue(event);
  }
}

let service: AuthAuditService | null = null;

export function getAuthAuditService(): AuthAuditService {
  if (service) return service;

  service = new OutboxAuthAuditService(new AuthAuditOutboxRepository());
  return service;
}

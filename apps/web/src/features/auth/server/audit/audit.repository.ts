import { and, eq, lte, sql } from "drizzle-orm";
import { authAuditOutbox } from "@afenda/db";

import { getDbForAuth } from "../auth-db";
import type { AuthAuditEvent } from "./audit.types";

export interface AuthAuditOutboxRow {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attemptCount: number;
  availableAt: Date;
}

export class AuthAuditOutboxRepository {
  private get db() {
    return getDbForAuth();
  }

  async enqueue(event: AuthAuditEvent): Promise<void> {
    await this.db.insert(authAuditOutbox).values({
      eventType: event.type,
      aggregateType: "auth",
      aggregateId: event.context.userId ?? event.context.email ?? null,
      payload: {
        type: event.type,
        context: event.context,
      },
      status: "pending",
      availableAt: sql`now()`,
    });
  }

  async listClaimable(limit = 100): Promise<AuthAuditOutboxRow[]> {
    const rows = await this.db
      .select()
      .from(authAuditOutbox)
      .where(
        and(
          eq(authAuditOutbox.status, "pending"),
          lte(authAuditOutbox.availableAt, sql`now()`),
        ),
      )
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status,
      attemptCount: row.attemptCount,
      availableAt: row.availableAt,
    }));
  }

  async claim(id: string): Promise<boolean> {
    const rows = await this.db
      .update(authAuditOutbox)
      .set({
        status: "processing",
        claimedAt: sql`now()`,
        attemptCount: sql`${authAuditOutbox.attemptCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(authAuditOutbox.id, id),
          eq(authAuditOutbox.status, "pending"),
        ),
      )
      .returning({ id: authAuditOutbox.id });

    return rows.length > 0;
  }

  async markSent(id: string): Promise<void> {
    await this.db
      .update(authAuditOutbox)
      .set({
        status: "sent",
        processedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(authAuditOutbox.id, id));
  }

  async markFailed(
    id: string,
    errorMessage: string,
    retryAfterSeconds = 60,
  ): Promise<void> {
    await this.db
      .update(authAuditOutbox)
      .set({
        status: "pending",
        errorMessage,
        availableAt: sql`now() + make_interval(secs => ${retryAfterSeconds})`,
        updatedAt: sql`now()`,
      })
      .where(eq(authAuditOutbox.id, id));
  }

  async markDead(id: string, errorMessage: string): Promise<void> {
    await this.db
      .update(authAuditOutbox)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: sql`now()`,
      })
      .where(eq(authAuditOutbox.id, id));
  }

  async getById(id: string): Promise<{ id: string; status: string } | null> {
    const rows = await this.db
      .select({ id: authAuditOutbox.id, status: authAuditOutbox.status })
      .from(authAuditOutbox)
      .where(eq(authAuditOutbox.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Retry a failed outbox event: reset to pending so worker picks it up. */
  async retryFailedEvent(id: string): Promise<boolean> {
    const rows = await this.db
      .update(authAuditOutbox)
      .set({
        status: "pending",
        errorMessage: null,
        availableAt: sql`now()`,
        claimedAt: null,
        processedAt: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(authAuditOutbox.id, id), eq(authAuditOutbox.status, "failed")),
      )
      .returning({ id: authAuditOutbox.id });

    return rows.length > 0;
  }
}

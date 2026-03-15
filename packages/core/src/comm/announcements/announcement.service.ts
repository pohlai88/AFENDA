import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { commAnnouncement, commAnnouncementRead, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CorrelationId,
  PrincipalId,
  AnnouncementId,
  AnnouncementReadId,
  CreateAnnouncementCommand,
  PublishAnnouncementCommand,
  UpdateAnnouncementCommand,
  ScheduleAnnouncementCommand,
  ArchiveAnnouncementCommand,
  UnscheduleAnnouncementCommand,
  UnarchiveAnnouncementCommand,
  AcknowledgeAnnouncementCommand,
  CommAnnouncementEvent,
} from "@afenda/contracts";
import { AnnouncementOutboxRecordSchema, CommAnnouncementEvents } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";
import { ensureScheduledAtInFuture } from "./create-persisted-announcement.js";

// ── Context & result types ────────────────────────────────────────────────────

export interface CommAnnouncementPolicyContext {
  principalId?: PrincipalId | null;
}

export type CommAnnouncementServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommAnnouncementServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommAnnouncementServiceError };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAnnouncementNumber(): string {
  return `ANN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function requirePrincipal(
  policyCtx: CommAnnouncementPolicyContext,
): CommAnnouncementServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

function normalizeUtcString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function normalizeAudienceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => item !== null);
}

function buildAnnouncementSnapshot(announcement: Record<string, unknown>) {
  return {
    title: String(announcement.title ?? ""),
    body: String(announcement.body ?? ""),
    status: String(announcement.status ?? "draft"),
    audienceType: String(announcement.audienceType ?? "org"),
    audienceIds: normalizeAudienceIds(announcement.audienceIds),
    scheduledAt: normalizeUtcString(announcement.scheduledAt),
  };
}

const ANNOUNCEMENT_OUTBOX_CREATED_AT_FALLBACK = "1970-01-01T00:00:00.000Z";

async function emitAnnouncementOutboxEvent(
  tx: any,
  input: {
    orgId: string;
    eventName: CommAnnouncementEvent;
    correlationId: CorrelationId;
    payload: Record<string, unknown>;
    occurredAt: string | null;
  },
): Promise<void> {
  AnnouncementOutboxRecordSchema.parse({
    id: randomUUID(),
    eventName: input.eventName,
    payload: input.payload,
    createdAt: input.occurredAt ?? ANNOUNCEMENT_OUTBOX_CREATED_AT_FALLBACK,
  });

  await tx.insert(outboxEvent).values({
    orgId: input.orgId,
    type: input.eventName,
    version: "1",
    correlationId: input.correlationId,
    payload: input.payload,
  });
}

async function loadAnnouncement(db: DbClient, orgId: string, announcementId: AnnouncementId) {
  const [row] = await db
    .select()
    .from(commAnnouncement)
    .where(and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, announcementId)));
  return row ?? null;
}

// ── createAnnouncement ────────────────────────────────────────────────────────

export async function createAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: CreateAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId; announcementNumber: string }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  if (params.scheduledAt) {
    try {
      ensureScheduledAtInFuture(params.scheduledAt);
    } catch {
      return {
        ok: false,
        error: {
          code: "COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE",
          message: "scheduledAt must be in the future",
        },
      };
    }
  }

  const announcementNumber = buildAnnouncementNumber();

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.created" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber, title: params.title, audienceType: params.audienceType },
    },
    async (tx) => {
      const [announcement] = await tx
        .insert(commAnnouncement)
        .values({
          orgId,
          announcementNumber,
          title: params.title,
          body: params.body,
          status: params.scheduledAt ? "scheduled" : "draft",
          audienceType: params.audienceType,
          audienceIds: params.audienceIds ?? [],
          scheduledAt: params.scheduledAt ? new Date(params.scheduledAt as any) : null, // gate:allow-js-date — parsing ISO string
          createdByPrincipalId: principalId,
        })
        .returning();

      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Created,
        correlationId,
        occurredAt: normalizeUtcString((announcement as Record<string, unknown>).createdAt),
        payload: {
          announcementId: announcement!.id,
          announcementNumber,
          orgId,
          title: params.title,
          audienceType: params.audienceType,
          audienceIds: params.audienceIds ?? [],
          correlationId,
        },
      });

      return announcement!;
    },
  );

  return { ok: true, data: { id: result.id as AnnouncementId, announcementNumber } };
}

// ── publishAnnouncement ───────────────────────────────────────────────────────

export async function publishAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: PublishAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }
  if (existing.status === "published") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_ALREADY_PUBLISHED",
        message: "Announcement is already published",
      },
    };
  }
  if (existing.status === "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_ALREADY_ARCHIVED",
        message: "Cannot publish an archived announcement",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.published" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, title: existing.title },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set({
          status: "published",
          publishedAt: sql`now()`,
          publishedByPrincipalId: principalId,
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Published,
        correlationId,
        occurredAt: normalizeUtcString((updated as Record<string, unknown>).updatedAt),
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          title: existing.title,
          audienceType: existing.audienceType,
          audienceIds: normalizeAudienceIds(existing.audienceIds),
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── updateAnnouncement ────────────────────────────────────────────────────────

export async function updateAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: UpdateAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_ALREADY_ARCHIVED",
        message: "Cannot update an archived announcement",
      },
    };
  }

  const hasAnyUpdatableField =
    params.title !== undefined ||
    params.body !== undefined ||
    params.audienceType !== undefined ||
    params.audienceIds !== undefined;
  if (!hasAnyUpdatableField) {
    return {
      ok: false,
      error: {
        code: "SHARED_VALIDATION_ERROR",
        message: "At least one updatable field is required",
      },
    };
  }

  if ((params.audienceType !== undefined) !== (params.audienceIds !== undefined)) {
    return {
      ok: false,
      error: {
        code: "SHARED_VALIDATION_ERROR",
        message: "audienceType and audienceIds must be provided together",
      },
    };
  }

  const previous = buildAnnouncementSnapshot(existing as Record<string, unknown>);
  const updateSet: Record<string, unknown> = {
    updatedAt: sql`now()`,
  };

  if (params.title !== undefined) updateSet.title = params.title;
  if (params.body !== undefined) updateSet.body = params.body;
  if (params.audienceType !== undefined) updateSet.audienceType = params.audienceType;
  if (params.audienceIds !== undefined) updateSet.audienceIds = params.audienceIds;

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.updated" as const,
      entityType: "announcement" as const,
      correlationId,
      details: {
        announcementNumber: existing.announcementNumber,
        hasTitleUpdate: params.title !== undefined,
        hasBodyUpdate: params.body !== undefined,
        hasAudienceUpdate: params.audienceType !== undefined,
      },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set(updateSet as any)
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      const current = buildAnnouncementSnapshot(updated as unknown as Record<string, unknown>);
      const updatedAt = normalizeUtcString((updated as Record<string, unknown>).updatedAt);

      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Updated,
        correlationId,
        occurredAt: updatedAt,
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          previous,
          current,
          updatedAt,
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── scheduleAnnouncement ──────────────────────────────────────────────────────

export async function scheduleAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: ScheduleAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_INVALID_STATUS_TRANSITION",
        message: "Only draft or scheduled announcements can be scheduled",
      },
    };
  }

  const previousScheduledAt = normalizeUtcString(existing.scheduledAt);
  const isReschedule = existing.status === "scheduled" && previousScheduledAt !== null;

  try {
    ensureScheduledAtInFuture(params.scheduledAt);
  } catch {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_SCHEDULED_AT_MUST_BE_FUTURE",
        message: "scheduledAt must be in the future",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: isReschedule ? "announcement.rescheduled" : "announcement.scheduled",
      entityType: "announcement" as const,
      correlationId,
      details: {
        announcementNumber: existing.announcementNumber,
        previousScheduledAt,
        scheduledAt: params.scheduledAt,
      },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set({
          status: "scheduled",
          scheduledAt: new Date(params.scheduledAt as any), // gate:allow-js-date — parsing ISO string
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      const updatedAt = normalizeUtcString(updated!.updatedAt);
      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: isReschedule
          ? CommAnnouncementEvents.Rescheduled
          : CommAnnouncementEvents.Scheduled,
        correlationId,
        occurredAt: updatedAt,
        payload: {
          announcementId: updated!.id,
          announcementNumber: updated!.announcementNumber,
          orgId,
          previousScheduledAt,
          scheduledAt: normalizeUtcString(updated!.scheduledAt),
          updatedAt,
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── unscheduleAnnouncement ───────────────────────────────────────────────────

export async function unscheduleAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: UnscheduleAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }

  const previousScheduledAt = normalizeUtcString(existing.scheduledAt);
  if (existing.status !== "scheduled" || previousScheduledAt === null) {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_INVALID_STATUS_TRANSITION",
        message: "Only scheduled announcements can be unscheduled",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.unscheduled" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, previousScheduledAt },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set({
          status: "draft",
          scheduledAt: null,
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      const updatedAt = normalizeUtcString(updated!.updatedAt);
      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Unscheduled,
        correlationId,
        occurredAt: updatedAt,
        payload: {
          announcementId: updated!.id,
          announcementNumber: updated!.announcementNumber,
          orgId,
          previousScheduledAt,
          status: "draft",
          updatedAt,
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── archiveAnnouncement ───────────────────────────────────────────────────────

export async function archiveAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: ArchiveAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }
  if (existing.status === "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_ALREADY_ARCHIVED",
        message: "Announcement is already archived",
      },
    };
  }
  if (existing.status === "draft" || existing.status === "scheduled") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_INVALID_STATUS_TRANSITION",
        message: "Only published announcements can be archived",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.archived" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, title: existing.title },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set({ status: "archived", updatedAt: sql`now()` })
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Archived,
        correlationId,
        occurredAt: normalizeUtcString((updated as Record<string, unknown>).updatedAt),
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── unarchiveAnnouncement ────────────────────────────────────────────────────

export async function unarchiveAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: UnarchiveAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }

  if (existing.status !== "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_INVALID_STATUS_TRANSITION",
        message: "Only archived announcements can be unarchived",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.unarchived" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, previousStatus: "archived" },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commAnnouncement)
        .set({
          status: "draft",
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, params.announcementId)),
        )
        .returning();

      const updatedAt = normalizeUtcString(updated!.updatedAt);
      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Unarchived,
        correlationId,
        occurredAt: updatedAt,
        payload: {
          announcementId: updated!.id,
          announcementNumber: updated!.announcementNumber,
          orgId,
          previousStatus: "archived",
          status: "draft",
          updatedAt,
          correlationId,
        },
      });

      return updated!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementId } };
}

// ── acknowledgeAnnouncement ───────────────────────────────────────────────────

export async function acknowledgeAnnouncement(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommAnnouncementPolicyContext,
  correlationId: CorrelationId,
  params: AcknowledgeAnnouncementCommand,
): Promise<CommAnnouncementServiceResult<{ id: AnnouncementReadId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId;

  const existing = await loadAnnouncement(db, orgId, params.announcementId);
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
    };
  }
  if (existing.status !== "published") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_NOT_PUBLISHED",
        message: "Can only acknowledge published announcements",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.acknowledged" as const,
      entityType: "announcement_read" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, title: existing.title },
    },
    async (tx) => {
      const [read] = await tx
        .insert(commAnnouncementRead)
        .values({
          orgId,
          announcementId: params.announcementId,
          principalId,
          acknowledgedAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: [
            commAnnouncementRead.orgId,
            commAnnouncementRead.announcementId,
            commAnnouncementRead.principalId,
          ],
          set: { acknowledgedAt: sql`now()` },
        })
        .returning();

      await emitAnnouncementOutboxEvent(tx, {
        orgId,
        eventName: CommAnnouncementEvents.Acknowledged,
        correlationId,
        occurredAt: normalizeUtcString((read as Record<string, unknown>).acknowledgedAt),
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          principalId,
          correlationId,
        },
      });

      return read!;
    },
  )) as any;

  return { ok: true, data: { id: result.id as AnnouncementReadId } };
}

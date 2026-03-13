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
  ScheduleAnnouncementCommand,
  ArchiveAnnouncementCommand,
  AcknowledgeAnnouncementCommand,
} from "@afenda/contracts";
import {
  COMM_ANNOUNCEMENT_CREATED,
  COMM_ANNOUNCEMENT_PUBLISHED,
  COMM_ANNOUNCEMENT_SCHEDULED,
  COMM_ANNOUNCEMENT_ARCHIVED,
  COMM_ANNOUNCEMENT_ACKNOWLEDGED,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";

// ── Context & result types ────────────────────────────────────────────────────

export interface CommAnnouncementPolicyContext {
  principalId: PrincipalId | null;
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

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ANNOUNCEMENT_CREATED,
        version: "1",
        correlationId,
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

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ANNOUNCEMENT_PUBLISHED,
        version: "1",
        correlationId,
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          title: existing.title,
          audienceType: existing.audienceType,
          audienceIds: existing.audienceIds,
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
  if (existing.status !== "draft") {
    return {
      ok: false,
      error: {
        code: "COMM_ANNOUNCEMENT_INVALID_STATUS_TRANSITION",
        message: "Only draft announcements can be scheduled",
      },
    };
  }

  const result = (await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "announcement.scheduled" as const,
      entityType: "announcement" as const,
      correlationId,
      details: { announcementNumber: existing.announcementNumber, scheduledAt: params.scheduledAt },
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

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ANNOUNCEMENT_SCHEDULED,
        version: "1",
        correlationId,
        payload: {
          announcementId: params.announcementId,
          announcementNumber: existing.announcementNumber,
          orgId,
          scheduledAt: params.scheduledAt,
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

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ANNOUNCEMENT_ARCHIVED,
        version: "1",
        correlationId,
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

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ANNOUNCEMENT_ACKNOWLEDGED,
        version: "1",
        correlationId,
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

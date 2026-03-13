/**
 * Helper to convert a validated AnnouncementCreate into a persisted Announcement.
 * Centralizes creation logic, fills server-owned fields, and enforces runtime invariants
 * (e.g. scheduledAt must be in the future for scheduled announcements).
 *
 * Does NOT import @afenda/db — use for validation only; caller handles DB insert.
 */
import { randomUUID } from "node:crypto";
import type { Announcement, AnnouncementCreate } from "@afenda/contracts";
import {
  AnnouncementCreateSchema,
  AnnouncementSchema,
} from "@afenda/contracts";

export interface CreatePersistedAnnouncementOptions {
  /** For deterministic tests; defaults to new Date() when not provided. */
  now?: Date;
}

/**
 * Throws if scheduledAt is not a valid datetime or is not in the future.
 * Reusable for defense-in-depth in API handlers and job processors.
 */
export function ensureScheduledAtInFuture(
  scheduledAt: string | null | undefined,
  now: Date = new Date(),
): void {
  if (!scheduledAt) return;
  const scheduled = new Date(scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error("scheduledAt is not a valid datetime");
  }
  if (scheduled <= now) {
    throw new Error("scheduledAt must be in the future");
  }
}

/**
 * Convert a validated AnnouncementCreate into a persisted Announcement.
 * - Validates incoming payload with AnnouncementCreateSchema
 * - Enforces scheduledAt in future when status is "scheduled"
 * - Generates id, createdAt, updatedAt
 * - Returns validated Announcement for DB insert
 */
export function createPersistedAnnouncement(
  raw: unknown,
  opts?: CreatePersistedAnnouncementOptions,
): Announcement {
  const now = opts?.now ?? new Date();
  const nowIso = now.toISOString();

  const create = AnnouncementCreateSchema.parse(raw) as AnnouncementCreate;

  if (create.status === "scheduled") {
    ensureScheduledAtInFuture(create.scheduledAt, now);
  }

  const id = randomUUID();
  const audienceIds = create.audienceIds ?? [];
  const scheduledAt = create.scheduledAt ?? null;
  const publishedAt =
    create.status === "published" ? (create.publishedAt ?? nowIso) : null;
  const publishedByPrincipalId =
    create.status === "published"
      ? (create.publishedByPrincipalId ?? create.createdByPrincipalId)
      : null;

  const persisted = {
    id,
    orgId: create.orgId,
    announcementNumber: create.announcementNumber,
    title: create.title,
    body: create.body,
    status: create.status,
    audienceType: create.audienceType,
    audienceIds,
    scheduledAt,
    publishedAt,
    publishedByPrincipalId,
    createdByPrincipalId: create.createdByPrincipalId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return AnnouncementSchema.parse(persisted) as Announcement;
}

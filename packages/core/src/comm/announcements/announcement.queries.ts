import type { DbClient } from "@afenda/db";
import {
  commAnnouncement,
  commAnnouncementRead,
  iamPrincipalRole,
  iamRole,
  membership,
  organization,
  party,
  partyRole,
  person,
} from "@afenda/db";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import type {
  AnnouncementId,
  AnnouncementStatus,
  OrgId,
  PrincipalId,
  CursorPage,
} from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// ── Row types ─────────────────────────────────────────────────────────────────

export interface AnnouncementRow {
  id: string;
  orgId: string;
  announcementNumber: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  audienceType: string;
  audienceIds: unknown;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  publishedByPrincipalId: string | null;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementReadRow {
  id: string;
  orgId: string;
  announcementId: string;
  principalId: string;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export interface AnnouncementListParams {
  cursor?: string;
  limit?: number;
  status?: AnnouncementStatus;
  createdByPrincipalId?: PrincipalId;
}

export interface AnnouncementAudienceOptionRow {
  id: string;
  label: string;
}

export interface AnnouncementAudienceOptions {
  teams: AnnouncementAudienceOptionRow[];
  roles: AnnouncementAudienceOptionRow[];
}

export interface AnnouncementAckSummary {
  announcementId: string;
  targetedCount: number;
  acknowledgedCount: number;
  pendingCount: number;
  progressPercent: number;
}

// ── Cursor helpers ────────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listAnnouncements(
  db: DbClient,
  orgId: OrgId,
  params: AnnouncementListParams = {},
): Promise<CursorPage<AnnouncementRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(commAnnouncement.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(commAnnouncement.status, params.status));
  }
  if (params.createdByPrincipalId) {
    conditions.push(eq(commAnnouncement.createdByPrincipalId, params.createdByPrincipalId));
  }
  if (params.cursor) {
    conditions.push(gt(commAnnouncement.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commAnnouncement)
    .where(and(...conditions))
    .orderBy(desc(commAnnouncement.updatedAt), asc(commAnnouncement.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as AnnouncementRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getAnnouncementById(
  db: DbClient,
  orgId: OrgId,
  id: AnnouncementId,
): Promise<AnnouncementRow | null> {
  const [row] = await db
    .select()
    .from(commAnnouncement)
    .where(and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.id, id)));
  return (row as AnnouncementRow) ?? null;
}

export async function listAnnouncementReads(
  db: DbClient,
  orgId: OrgId,
  announcementId: AnnouncementId,
): Promise<AnnouncementReadRow[]> {
  const rows = await db
    .select()
    .from(commAnnouncementRead)
    .where(
      and(
        eq(commAnnouncementRead.orgId, orgId),
        eq(commAnnouncementRead.announcementId, announcementId),
      ),
    )
    .orderBy(asc(commAnnouncementRead.acknowledgedAt));
  return rows as AnnouncementReadRow[];
}

export async function getAnnouncementReadByPrincipal(
  db: DbClient,
  orgId: OrgId,
  announcementId: AnnouncementId,
  principalId: PrincipalId,
): Promise<AnnouncementReadRow | null> {
  const [row] = await db
    .select()
    .from(commAnnouncementRead)
    .where(
      and(
        eq(commAnnouncementRead.orgId, orgId),
        eq(commAnnouncementRead.announcementId, announcementId),
        eq(commAnnouncementRead.principalId, principalId),
      ),
    );
  return (row as AnnouncementReadRow) ?? null;
}

export async function countUnacknowledgedForPrincipal(
  db: DbClient,
  orgId: OrgId,
  principalId: PrincipalId,
): Promise<number> {
  // Published announcements for the org that this principal hasn't acknowledged
  const published = await db
    .select({ id: commAnnouncement.id })
    .from(commAnnouncement)
    .where(and(eq(commAnnouncement.orgId, orgId), eq(commAnnouncement.status, "published")));

  if (published.length === 0) return 0;

  const publishedIds = published.map((r) => r.id);

  const acknowledged = await db
    .select({ announcementId: commAnnouncementRead.announcementId })
    .from(commAnnouncementRead)
    .where(
      and(
        eq(commAnnouncementRead.orgId, orgId),
        eq(commAnnouncementRead.principalId, principalId),
        inArray(commAnnouncementRead.announcementId, publishedIds),
      ),
    );

  const acknowledgedIds = new Set(acknowledged.map((r) => r.announcementId));
  return publishedIds.filter((id) => !acknowledgedIds.has(id)).length;
}

async function resolveAnnouncementAudiencePrincipalIds(
  db: DbClient,
  orgId: OrgId,
  audienceType: string,
  audienceIds: string[],
): Promise<string[]> {
  if (audienceType === "org") {
    const rows = await db
      .selectDistinct({ principalId: membership.principalId })
      .from(membership)
      .innerJoin(partyRole, eq(partyRole.id, membership.partyRoleId))
      .where(
        and(
          eq(partyRole.orgId, orgId),
          eq(membership.status, "active"),
          isNull(membership.revokedAt),
        ),
      );
    return rows.map((row) => row.principalId);
  }

  if (audienceType === "team") {
    if (audienceIds.length === 0) return [];

    const rows = await db
      .selectDistinct({ principalId: membership.principalId })
      .from(membership)
      .innerJoin(partyRole, eq(partyRole.id, membership.partyRoleId))
      .where(
        and(
          eq(partyRole.orgId, orgId),
          inArray(membership.partyRoleId, audienceIds),
          eq(membership.status, "active"),
          isNull(membership.revokedAt),
        ),
      );

    return rows.map((row) => row.principalId);
  }

  if (audienceType === "role") {
    if (audienceIds.length === 0) return [];

    const rows = await db
      .selectDistinct({ principalId: iamPrincipalRole.principalId })
      .from(iamPrincipalRole)
      .where(and(eq(iamPrincipalRole.orgId, orgId), inArray(iamPrincipalRole.roleId, audienceIds)));

    return rows.map((row) => row.principalId);
  }

  return [];
}

export async function getAnnouncementAckSummary(
  db: DbClient,
  orgId: OrgId,
  announcementId: AnnouncementId,
): Promise<AnnouncementAckSummary | null> {
  const announcement = await getAnnouncementById(db, orgId, announcementId);
  if (!announcement) return null;

  const audienceIds = Array.isArray(announcement.audienceIds)
    ? announcement.audienceIds.filter((value): value is string => typeof value === "string")
    : [];

  const targetPrincipalIds = await resolveAnnouncementAudiencePrincipalIds(
    db,
    orgId,
    announcement.audienceType,
    audienceIds,
  );

  const targetSet = new Set(targetPrincipalIds);
  if (targetSet.size === 0) {
    return {
      announcementId,
      targetedCount: 0,
      acknowledgedCount: 0,
      pendingCount: 0,
      progressPercent: 0,
    };
  }

  const acknowledgedRows = await db
    .selectDistinct({ principalId: commAnnouncementRead.principalId })
    .from(commAnnouncementRead)
    .where(
      and(
        eq(commAnnouncementRead.orgId, orgId),
        eq(commAnnouncementRead.announcementId, announcementId),
        inArray(commAnnouncementRead.principalId, Array.from(targetSet)),
      ),
    );

  const acknowledgedCount = acknowledgedRows.length;
  const targetedCount = targetSet.size;
  const pendingCount = Math.max(targetedCount - acknowledgedCount, 0);

  return {
    announcementId,
    targetedCount,
    acknowledgedCount,
    pendingCount,
    progressPercent:
      targetedCount === 0 ? 0 : Math.round((acknowledgedCount / targetedCount) * 100),
  };
}

export async function listAnnouncementAudienceOptions(
  db: DbClient,
  orgId: OrgId,
): Promise<AnnouncementAudienceOptions> {
  const [teamRows, roleRows] = await Promise.all([
    db
      .select({
        id: partyRole.id,
        roleType: partyRole.roleType,
        orgName: organization.name,
        personName: person.name,
        externalKey: party.externalKey,
      })
      .from(partyRole)
      .innerJoin(party, eq(party.id, partyRole.partyId))
      .leftJoin(organization, eq(organization.id, party.id))
      .leftJoin(person, eq(person.id, party.id))
      .where(eq(partyRole.orgId, orgId))
      .orderBy(asc(partyRole.roleType), asc(organization.name), asc(person.name), asc(partyRole.id))
      .limit(200),
    db
      .select({ id: iamRole.id, name: iamRole.name, key: iamRole.key })
      .from(iamRole)
      .where(eq(iamRole.orgId, orgId))
      .orderBy(asc(iamRole.name), asc(iamRole.id))
      .limit(200),
  ]);

  const teamBaseLabels = teamRows.map((row) => ({
    id: row.id,
    label: `${row.orgName ?? row.personName ?? row.externalKey ?? row.roleType} (${row.roleType})`,
  }));

  const duplicateCounts = new Map<string, number>();
  for (const item of teamBaseLabels) {
    duplicateCounts.set(item.label, (duplicateCounts.get(item.label) ?? 0) + 1);
  }

  return {
    teams: teamBaseLabels.map((item) => ({
      id: item.id,
      label:
        (duplicateCounts.get(item.label) ?? 0) > 1
          ? `${item.label} - ${item.id.slice(0, 8)}`
          : item.label,
    })),
    roles: roleRows.map((row) => ({
      id: row.id,
      label: `${row.name} (${row.key})`,
    })),
  };
}

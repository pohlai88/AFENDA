import type { DbClient } from "@afenda/db";
import { commLabel, commLabelAssignment } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { CommLabelEntityType, CommLabelId, PrincipalId } from "@afenda/contracts";

export interface CommLabelRow {
  id: CommLabelId;
  orgId: string;
  name: string;
  color: string;
  createdByPrincipalId: PrincipalId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommLabelAssignmentRow {
  id: string;
  orgId: string;
  labelId: CommLabelId;
  entityType: CommLabelEntityType;
  entityId: string;
  assignedByPrincipalId: PrincipalId;
  createdAt: Date;
}

export async function listLabels(db: DbClient, orgId: string): Promise<CommLabelRow[]> {
  const rows = await db
    .select()
    .from(commLabel)
    .where(eq(commLabel.orgId, orgId))
    .orderBy(asc(commLabel.name), asc(commLabel.id));

  return rows as CommLabelRow[];
}

export async function getLabelById(
  db: DbClient,
  orgId: string,
  labelId: CommLabelId,
): Promise<CommLabelRow | null> {
  const [row] = await db
    .select()
    .from(commLabel)
    .where(and(eq(commLabel.orgId, orgId), eq(commLabel.id, labelId)));

  return (row as CommLabelRow) ?? null;
}

export async function listEntityLabelAssignments(
  db: DbClient,
  orgId: string,
  entityType: CommLabelEntityType,
  entityId: string,
): Promise<CommLabelAssignmentRow[]> {
  const rows = await db
    .select()
    .from(commLabelAssignment)
    .where(
      and(
        eq(commLabelAssignment.orgId, orgId),
        eq(commLabelAssignment.entityType, entityType),
        eq(commLabelAssignment.entityId, entityId),
      ),
    )
    .orderBy(asc(commLabelAssignment.createdAt), asc(commLabelAssignment.id));

  return rows as CommLabelAssignmentRow[];
}

export async function listEntityLabels(
  db: DbClient,
  orgId: string,
  entityType: CommLabelEntityType,
  entityId: string,
): Promise<CommLabelRow[]> {
  const assignments = await listEntityLabelAssignments(db, orgId, entityType, entityId);
  if (assignments.length === 0) return [];

  const labelsById = new Map((await listLabels(db, orgId)).map((label) => [label.id, label]));

  return assignments
    .map((assignment) => labelsById.get(assignment.labelId))
    .filter((label): label is CommLabelRow => Boolean(label));
}

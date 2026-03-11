import type { DbClient } from "@afenda/db";
import { hrmOrgUnits } from "@afenda/db";
import { asc, eq } from "drizzle-orm";

export interface OrgTreeNode {
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName: string;
  legalEntityId: string;
  parentOrgUnitId: string | null;
  status: string;
  children: OrgTreeNode[];
}

export async function getOrgTree(db: DbClient, orgId: string): Promise<OrgTreeNode[]> {
  const rows = await db
    .select({
      orgUnitId: hrmOrgUnits.id,
      orgUnitCode: hrmOrgUnits.orgUnitCode,
      orgUnitName: hrmOrgUnits.orgUnitName,
      legalEntityId: hrmOrgUnits.legalEntityId,
      parentOrgUnitId: hrmOrgUnits.parentOrgUnitId,
      status: hrmOrgUnits.status,
    })
    .from(hrmOrgUnits)
    .where(eq(hrmOrgUnits.orgId, orgId))
    .orderBy(asc(hrmOrgUnits.orgUnitName));

  const byId = new Map<string, OrgTreeNode>();

  for (const row of rows) {
    byId.set(row.orgUnitId, {
      ...row,
      parentOrgUnitId: row.parentOrgUnitId ?? null,
      children: [],
    });
  }

  const roots: OrgTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parentOrgUnitId) {
      const parent = byId.get(node.parentOrgUnitId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots;
}
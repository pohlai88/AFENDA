import type { DbClient } from "@afenda/db";
import { hrmEmployeeDocuments } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listEmployeeDocuments(
  db: DbClient,
  orgId: string,
  employmentId: string,
) {
  return db
    .select()
    .from(hrmEmployeeDocuments)
    .where(
      and(
        eq(hrmEmployeeDocuments.orgId, orgId),
        eq(hrmEmployeeDocuments.employmentId, employmentId),
      ),
    )
    .orderBy(hrmEmployeeDocuments.createdAt);
}

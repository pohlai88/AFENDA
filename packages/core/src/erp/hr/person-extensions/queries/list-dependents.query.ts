import type { DbClient } from "@afenda/db";
import { hrmPersonDependents } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listDependents(
  db: DbClient,
  orgId: string,
  personId: string,
) {
  return db
    .select()
    .from(hrmPersonDependents)
    .where(
      and(
        eq(hrmPersonDependents.orgId, orgId),
        eq(hrmPersonDependents.personId, personId),
      ),
    )
    .orderBy(hrmPersonDependents.createdAt);
}

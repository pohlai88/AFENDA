import type { DbClient } from "@afenda/db";
import { hrmPersonAddresses } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listPersonAddresses(
  db: DbClient,
  orgId: string,
  personId: string,
) {
  return db
    .select()
    .from(hrmPersonAddresses)
    .where(
      and(
        eq(hrmPersonAddresses.orgId, orgId),
        eq(hrmPersonAddresses.personId, personId),
      ),
    )
    .orderBy(hrmPersonAddresses.createdAt);
}

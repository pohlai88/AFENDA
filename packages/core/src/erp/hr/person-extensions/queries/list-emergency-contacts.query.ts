import type { DbClient } from "@afenda/db";
import { hrmPersonEmergencyContacts } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export async function listEmergencyContacts(
  db: DbClient,
  orgId: string,
  personId: string,
) {
  return db
    .select()
    .from(hrmPersonEmergencyContacts)
    .where(
      and(
        eq(hrmPersonEmergencyContacts.orgId, orgId),
        eq(hrmPersonEmergencyContacts.personId, personId),
      ),
    )
    .orderBy(hrmPersonEmergencyContacts.createdAt);
}

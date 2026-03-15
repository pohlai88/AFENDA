import type { DbClient } from "@afenda/db";
import { hrmPersonIdentities } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface PersonIdentityRow {
  id: string;
  personId: string;
  identityType: string;
  identityNumber: string;
  issuingCountryCode: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  isPrimary: boolean;
  verificationStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listPersonIdentities(
  db: DbClient,
  orgId: string,
  personId: string,
): Promise<PersonIdentityRow[]> {
  const rows = await db
    .select({
      id: hrmPersonIdentities.id,
      personId: hrmPersonIdentities.personId,
      identityType: hrmPersonIdentities.identityType,
      identityNumber: hrmPersonIdentities.identityNumber,
      issuingCountryCode: hrmPersonIdentities.issuingCountryCode,
      issuedAt: hrmPersonIdentities.issuedAt,
      expiresAt: hrmPersonIdentities.expiresAt,
      isPrimary: hrmPersonIdentities.isPrimary,
      verificationStatus: hrmPersonIdentities.verificationStatus,
      createdAt: hrmPersonIdentities.createdAt,
      updatedAt: hrmPersonIdentities.updatedAt,
    })
    .from(hrmPersonIdentities)
    .where(and(eq(hrmPersonIdentities.orgId, orgId), eq(hrmPersonIdentities.personId, personId)))
    .orderBy(hrmPersonIdentities.createdAt);

  return rows;
}

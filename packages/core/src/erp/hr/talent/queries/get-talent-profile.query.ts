import type { DbClient } from "@afenda/db";
import { hrmTalentProfiles } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface GetTalentProfileParams {
  orgId: string;
  employmentId: string;
}

export interface TalentProfileView {
  talentProfileId: string;
  employmentId: string;
  potentialScore: number | null;
  readinessScore: number | null;
  careerAspiration: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getTalentProfile(
  db: DbClient,
  params: GetTalentProfileParams,
): Promise<TalentProfileView | null> {
  const [row] = await db
    .select({
      talentProfileId: hrmTalentProfiles.id,
      employmentId: hrmTalentProfiles.employmentId,
      potentialScore: hrmTalentProfiles.potentialScore,
      readinessScore: hrmTalentProfiles.readinessScore,
      careerAspiration: hrmTalentProfiles.careerAspiration,
      createdAt: hrmTalentProfiles.createdAt,
      updatedAt: hrmTalentProfiles.updatedAt,
    })
    .from(hrmTalentProfiles)
    .where(
      and(
        eq(hrmTalentProfiles.orgId, params.orgId),
        eq(hrmTalentProfiles.employmentId, params.employmentId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    talentProfileId: row.talentProfileId,
    employmentId: row.employmentId,
    potentialScore: row.potentialScore,
    readinessScore: row.readinessScore,
    careerAspiration: row.careerAspiration,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

import { and, desc, eq } from "drizzle-orm";
import type {
  InternalInterestRateEntity,
  NettingSessionEntity,
  NettingSessionItemEntity,
} from "@afenda/contracts";
import {
  treasuryInternalInterestRateTable,
  treasuryNettingSessionItemTable,
  treasuryNettingSessionTable,
} from "@afenda/db";

export interface NettingSessionQueriesDeps {
  db: any;
}

export class NettingSessionQueries {
  constructor(private deps: NettingSessionQueriesDeps) {}

  async getNettingSessionById(
    orgId: string,
    nettingSessionId: string,
  ): Promise<NettingSessionEntity | null> {
    const rows = await this.deps.db
      .select()
      .from(treasuryNettingSessionTable)
      .where(
        and(
          eq(treasuryNettingSessionTable.orgId, orgId),
          eq(treasuryNettingSessionTable.id, nettingSessionId),
        ),
      )
      .limit(1);

    return rows.length > 0 ? rows[0] : null;
  }

  async listNettingSessions(orgId: string): Promise<NettingSessionEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryNettingSessionTable)
      .where(eq(treasuryNettingSessionTable.orgId, orgId))
      .orderBy(desc(treasuryNettingSessionTable.createdAt));
  }

  async listNettingSessionItems(
    orgId: string,
    nettingSessionId: string,
  ): Promise<NettingSessionItemEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryNettingSessionItemTable)
      .where(
        and(
          eq(treasuryNettingSessionItemTable.orgId, orgId),
          eq(treasuryNettingSessionItemTable.nettingSessionId, nettingSessionId),
        ),
      )
      .orderBy(desc(treasuryNettingSessionItemTable.createdAt));
  }

  async listInternalInterestRates(orgId: string): Promise<InternalInterestRateEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryInternalInterestRateTable)
      .where(eq(treasuryInternalInterestRateTable.orgId, orgId))
      .orderBy(desc(treasuryInternalInterestRateTable.createdAt));
  }
}

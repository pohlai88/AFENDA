import { desc, eq } from "drizzle-orm";
import { treasuryLimitBreachTable, treasuryLimitTable, treasuryPolicyTable } from "@afenda/db";

export interface TreasuryPolicyQueriesDeps {
  db: any;
}

export class TreasuryPolicyQueries {
  constructor(private readonly deps: TreasuryPolicyQueriesDeps) {}

  async listPolicies(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryPolicyTable)
      .where(eq(treasuryPolicyTable.orgId, orgId))
      .orderBy(desc(treasuryPolicyTable.createdAt));
  }

  async listLimits(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryLimitTable)
      .where(eq(treasuryLimitTable.orgId, orgId))
      .orderBy(desc(treasuryLimitTable.createdAt));
  }

  async listBreaches(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryLimitBreachTable)
      .where(eq(treasuryLimitBreachTable.orgId, orgId))
      .orderBy(desc(treasuryLimitBreachTable.createdAt));
  }
}

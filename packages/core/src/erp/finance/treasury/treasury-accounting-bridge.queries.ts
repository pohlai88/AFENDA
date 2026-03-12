import { desc, eq } from "drizzle-orm";
import { treasuryAccountingPolicyTable, treasuryPostingBridgeTable } from "@afenda/db";

export interface TreasuryAccountingBridgeQueriesDeps {
  db: any;
}

export class TreasuryAccountingBridgeQueries {
  constructor(private readonly deps: TreasuryAccountingBridgeQueriesDeps) {}

  async listPolicies(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryAccountingPolicyTable)
      .where(eq(treasuryAccountingPolicyTable.orgId, orgId))
      .orderBy(desc(treasuryAccountingPolicyTable.createdAt));
  }

  async listPostingRequests(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryPostingBridgeTable)
      .where(eq(treasuryPostingBridgeTable.orgId, orgId))
      .orderBy(desc(treasuryPostingBridgeTable.createdAt));
  }
}

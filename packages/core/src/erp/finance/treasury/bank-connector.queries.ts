import { desc, eq } from "drizzle-orm";
import {
  treasuryBankConnectorExecutionTable,
  treasuryBankConnectorTable,
  treasuryMarketDataFeedTable,
  treasuryMarketDataObservationTable,
} from "@afenda/db";

export interface BankConnectorQueriesDeps {
  db: any;
}

export class BankConnectorQueries {
  constructor(private readonly deps: BankConnectorQueriesDeps) {}

  async listBankConnectors(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryBankConnectorTable)
      .where(eq(treasuryBankConnectorTable.orgId, orgId))
      .orderBy(desc(treasuryBankConnectorTable.createdAt));
  }

  async listBankConnectorExecutions(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryBankConnectorExecutionTable)
      .where(eq(treasuryBankConnectorExecutionTable.orgId, orgId))
      .orderBy(desc(treasuryBankConnectorExecutionTable.createdAt));
  }

  async listMarketDataFeeds(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryMarketDataFeedTable)
      .where(eq(treasuryMarketDataFeedTable.orgId, orgId))
      .orderBy(desc(treasuryMarketDataFeedTable.createdAt));
  }

  async listMarketDataObservations(orgId: string) {
    return this.deps.db
      .select()
      .from(treasuryMarketDataObservationTable)
      .where(eq(treasuryMarketDataObservationTable.orgId, orgId))
      .orderBy(desc(treasuryMarketDataObservationTable.createdAt));
  }
}

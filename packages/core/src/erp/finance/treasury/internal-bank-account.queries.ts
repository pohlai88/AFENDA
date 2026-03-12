import { desc, eq } from "drizzle-orm";
import type { InternalBankAccountEntity } from "@afenda/contracts";
import { treasuryInternalBankAccountTable } from "@afenda/db";

export interface InternalBankAccountQueriesDeps {
  db: any;
}

/**
 * Internal Bank Account Queries
 * Read-only queries for internal treasury accounts
 */
export class InternalBankAccountQueries {
  constructor(private deps: InternalBankAccountQueriesDeps) {}

  /**
   * Get an internal bank account by ID
   */
  async getById(
    orgId: string,
    accountId: string
  ): Promise<InternalBankAccountEntity | null> {
    const result = await this.deps.db
      .select()
      .from(treasuryInternalBankAccountTable)
      .where(
        eq(treasuryInternalBankAccountTable.id, accountId)
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * List all internal bank accounts for an org
   */
  async listByOrg(orgId: string): Promise<InternalBankAccountEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryInternalBankAccountTable)
      .where(eq(treasuryInternalBankAccountTable.orgId, orgId))
      .orderBy(desc(treasuryInternalBankAccountTable.createdAt));
  }

  /**
   * List active accounts for a legal entity
   */
  async listActiveByLegalEntity(
    orgId: string,
    legalEntityId: string
  ): Promise<InternalBankAccountEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryInternalBankAccountTable)
      .where(
        eq(treasuryInternalBankAccountTable.orgId, orgId),
        eq(treasuryInternalBankAccountTable.legalEntityId, legalEntityId),
        eq(treasuryInternalBankAccountTable.status, "active")
      )
      .orderBy(desc(treasuryInternalBankAccountTable.createdAt));
  }

  /**
   * Find account by code
   */
  async findByCode(
    orgId: string,
    code: string
  ): Promise<InternalBankAccountEntity | null> {
    const result = await this.deps.db
      .select()
      .from(treasuryInternalBankAccountTable)
      .where(
        eq(treasuryInternalBankAccountTable.orgId, orgId),
        eq(treasuryInternalBankAccountTable.code, code)
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }
}

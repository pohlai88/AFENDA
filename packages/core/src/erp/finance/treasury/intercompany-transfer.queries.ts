import { desc, eq, and } from "drizzle-orm";
import type { IntercompanyTransferEntity } from "@afenda/contracts";
import { treasuryIntercompanyTransferTable } from "@afenda/db";

export interface IntercompanyTransferQueriesDeps {
  db: any;
}

/**
 * Intercompany Transfer Queries
 * Read-only queries for intercompany transfers
 */
export class IntercompanyTransferQueries {
  constructor(private deps: IntercompanyTransferQueriesDeps) {}

  /**
   * Get an intercompany transfer by ID
   */
  async getById(
    orgrId: string,
    transferId: string
  ): Promise<IntercompanyTransferEntity | null> {
    const result = await this.deps.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(eq(treasuryIntercompanyTransferTable.id, transferId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * List all intercompany transfers for an org
   */
  async listByOrg(orgId: string): Promise<IntercompanyTransferEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(eq(treasuryIntercompanyTransferTable.orgId, orgId))
      .orderBy(desc(treasuryIntercompanyTransferTable.createdAt));
  }

  /**
   * List transfers with a specific status
   */
  async listByStatus(
    orgId: string,
    status: IntercompanyTransferEntity["status"]
  ): Promise<IntercompanyTransferEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(
        and(
          eq(treasuryIntercompanyTransferTable.orgId, orgId),
          eq(treasuryIntercompanyTransferTable.status, status)
        )
      )
      .orderBy(desc(treasuryIntercompanyTransferTable.createdAt));
  }

  /**
   * List pending approval transfers
   */
  async listPendingApproval(orgId: string): Promise<IntercompanyTransferEntity[]> {
    return this.deps.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(
        eq(treasuryIntercompanyTransferTable.orgId, orgId),
        eq(treasuryIntercompanyTransferTable.status, "pending_approval")
      )
      .orderBy(desc(treasuryIntercompanyTransferTable.createdAt));
  }

  /**
   * Find transfer by transfer number
   */
  async findByTransferNumber(
    orgId: string,
    transferNumber: string
  ): Promise<IntercompanyTransferEntity | null> {
    const result = await this.deps.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(
        eq(treasuryIntercompanyTransferTable.orgId, orgId),
        eq(treasuryIntercompanyTransferTable.transferNumber, transferNumber)
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }
}

import {
  authChainOfCustody,
  authControlRuns,
  authEvidenceExports,
  authReviewAttestations,
  authReviewCases,
} from "@afenda/db";

import { getDbForAuth } from "../auth-db";

export class AuthComplianceRepository {
  private get db() {
    return getDbForAuth();
  }

  async insertControlRun(values: (typeof authControlRuns.$inferInsert)) {
    const [row] = await this.db
      .insert(authControlRuns)
      .values(values)
      .returning();
    return row;
  }

  async insertAttestation(values: (typeof authReviewAttestations.$inferInsert)) {
    const [row] = await this.db
      .insert(authReviewAttestations)
      .values(values)
      .returning();
    return row;
  }

  async insertEvidenceExport(values: (typeof authEvidenceExports.$inferInsert)) {
    const [row] = await this.db
      .insert(authEvidenceExports)
      .values(values)
      .returning();
    return row;
  }

  async insertChainOfCustody(values: (typeof authChainOfCustody.$inferInsert)) {
    const [row] = await this.db
      .insert(authChainOfCustody)
      .values(values)
      .returning();
    return row;
  }

  async insertReviewCase(values: (typeof authReviewCases.$inferInsert)) {
    const [row] = await this.db
      .insert(authReviewCases)
      .values(values)
      .returning();
    return row;
  }
}

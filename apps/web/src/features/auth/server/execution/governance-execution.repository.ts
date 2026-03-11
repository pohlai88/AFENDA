import {
  authApprovalMatrix,
  authAuditorAccessGrants,
  authEvidencePackageItems,
  authEvidencePackages,
  authExportManifests,
  authReviewCycles,
  authReviewEscalations,
  authReviewReminders,
} from "@afenda/db";

import { getDbForAuth } from "../auth-db";

export class GovernanceExecutionRepository {
  private get db() {
    return getDbForAuth();
  }

  async insertReviewCycle(values: (typeof authReviewCycles.$inferInsert)) {
    return this.db.insert(authReviewCycles).values(values).returning();
  }

  async insertReminder(values: (typeof authReviewReminders.$inferInsert)) {
    return this.db.insert(authReviewReminders).values(values).returning();
  }

  async insertEscalation(values: (typeof authReviewEscalations.$inferInsert)) {
    return this.db.insert(authReviewEscalations).values(values).returning();
  }

  async insertEvidencePackage(
    values: (typeof authEvidencePackages.$inferInsert),
  ) {
    return this.db.insert(authEvidencePackages).values(values).returning();
  }

  async insertEvidencePackageItem(
    values: (typeof authEvidencePackageItems.$inferInsert),
  ) {
    return this.db
      .insert(authEvidencePackageItems)
      .values(values)
      .returning();
  }

  async insertManifest(values: (typeof authExportManifests.$inferInsert)) {
    return this.db.insert(authExportManifests).values(values).returning();
  }

  async insertAuditorGrant(
    values: (typeof authAuditorAccessGrants.$inferInsert),
  ) {
    return this.db.insert(authAuditorAccessGrants).values(values).returning();
  }

  async listApprovalMatrix() {
    return this.db.select().from(authApprovalMatrix);
  }
}

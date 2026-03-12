import type { Task } from "graphile-worker";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { treasuryPostingBridgeTable } from "@afenda/db";
import { getWorkerDb } from "./db-client";

export const handleTreasuryPostingRequested: Task = async (payload, helpers) => {
  const db = getWorkerDb();
  const event = payload as {
    type?: string;
    orgId?: string;
    correlationId?: string;
    payload?: { treasuryPostingBridgeId?: string };
  };

  const orgId = event.orgId;
  const postingBridgeId = event.payload?.treasuryPostingBridgeId;

  if (!orgId || !postingBridgeId) {
    helpers.logger.warn(
      `treasury posting event missing required fields: orgId=${orgId ?? "unknown"} postingBridgeId=${postingBridgeId ?? "unknown"}`,
    );
    return;
  }

  try {
    const rows = await db
      .select()
      .from(treasuryPostingBridgeTable)
      .where(
        and(
          eq(treasuryPostingBridgeTable.orgId, orgId),
          eq(treasuryPostingBridgeTable.id, postingBridgeId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      helpers.logger.warn(
        `treasury posting bridge not found: orgId=${orgId} postingBridgeId=${postingBridgeId}`,
      );
      return;
    }

    await db
      .update(treasuryPostingBridgeTable)
      .set({
        status: "posted",
        postedJournalEntryId: randomUUID(),
        failureReason: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(treasuryPostingBridgeTable.orgId, orgId),
          eq(treasuryPostingBridgeTable.id, postingBridgeId),
        ),
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : "treasury posting failed";

    await db
      .update(treasuryPostingBridgeTable)
      .set({
        status: "failed",
        failureReason: message,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(treasuryPostingBridgeTable.orgId, orgId),
          eq(treasuryPostingBridgeTable.id, postingBridgeId),
        ),
      );

    throw error;
  }

  helpers.logger.info(
    `processed treasury posting request: type=${event.type ?? "unknown"} orgId=${event.orgId ?? "unknown"} postingBridgeId=${event.payload?.treasuryPostingBridgeId ?? "unknown"} correlationId=${event.correlationId ?? "unknown"}`,
  );
};

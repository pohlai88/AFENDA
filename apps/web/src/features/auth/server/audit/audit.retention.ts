import { and, eq, lt, sql } from "drizzle-orm";

import { authAuditOutbox } from "@afenda/db";

import { getDbForAuth } from "../auth-db";

export async function archiveOrDeleteOldAuthAuditEvents(
  days = 90,
): Promise<number> {
  const db = getDbForAuth();

  const rows = await db
    .delete(authAuditOutbox)
    .where(
      and(
        lt(authAuditOutbox.createdAt, sql`now() - interval '1 day' * ${days}`),
        eq(authAuditOutbox.status, "sent"),
      ),
    )
    .returning({ id: authAuditOutbox.id });

  return rows.length;
}

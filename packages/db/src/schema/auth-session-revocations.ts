import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Auth session revocations — operator-initiated session invalidation.
 *
 * When an operator revokes a user's session, a row is inserted here.
 * The JWT callback should check this table to reject tokens for revoked users.
 */
export const authSessionRevocations = pgTable(
  "auth_session_revocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id").notNull(),
    revokedBy: text("revoked_by").notNull(),
    reason: text("reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("auth_session_revocations_user_id_idx").on(table.userId),
    createdAtIdx: index("auth_session_revocations_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

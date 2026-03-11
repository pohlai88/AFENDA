import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Auth anomaly acknowledgements — operator acknowledgement of risk findings.
 *
 * When an operator acknowledges an anomaly, a row is inserted here.
 * The anomaly service can filter acknowledged findings from the list.
 */
export const authAnomalyAcknowledgements = pgTable(
  "auth_anomaly_acknowledgements",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    anomalyCode: text("anomaly_code").notNull(),
    acknowledgedBy: text("acknowledged_by").notNull(),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index("auth_anomaly_acknowledgements_code_idx").on(
      table.anomalyCode,
    ),
    createdAtIdx: index("auth_anomaly_acknowledgements_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

import { describe, expect, it } from "vitest";

import {
  backfillValidator,
  bigintColumnMigrationTemplate,
  datePartitionColumnDefinition,
  type QueryablePool,
} from "../migration-helpers";

describe("shared migration-helpers", () => {
  it("builds generated date partition definition", () => {
    expect(datePartitionColumnDefinition("occurred_at", "date_partition")).toBe(
      "date_partition DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::date) STORED",
    );
  });

  it("builds bigint migration SQL template", () => {
    const sql = bigintColumnMigrationTemplate(
      "ledger_entries",
      "amount",
      "amount_minor",
      "currency_code",
      "currency_meta",
    );

    expect(sql).toContain(
      "ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS amount_minor BIGINT;",
    );
    expect(sql).toContain("ROUND(ledger_entries.amount * cm.minor_per_major)::bigint");
  });

  it("validates row counts and totals from queryable pool", async () => {
    const pool: QueryablePool = {
      async query(sql: string) {
        if (sql.includes("cnt_before")) {
          return { rows: [{ cnt_before: "3" }] };
        }
        if (sql.includes("cnt_after")) {
          return { rows: [{ cnt_after: "3" }] };
        }
        if (sql.includes("GROUP BY")) {
          return {
            rows: [
              { currency: "USD", total_before: "123", total_after: "123" },
              { currency: "SGD", total_before: "456", total_after: "456" },
            ],
          };
        }
        if (sql.includes("expected_minor")) {
          return { rows: [] };
        }
        throw new Error("unexpected SQL");
      },
    };

    const validator = backfillValidator({ pool, table: "ledger_entries" });

    await expect(validator.validateRowCounts()).resolves.toEqual({ before: 3n, after: 3n });
    await expect(validator.validateTotals(0n)).resolves.toBe(true);
    await expect(validator.sampleDiffs()).resolves.toEqual([]);
  });

  it("throws for totals mismatch", async () => {
    const pool: QueryablePool = {
      async query(sql: string) {
        if (sql.includes("cnt_before")) {
          return { rows: [{ cnt_before: "1" }] };
        }
        if (sql.includes("cnt_after")) {
          return { rows: [{ cnt_after: "1" }] };
        }
        if (sql.includes("GROUP BY")) {
          return { rows: [{ currency: "USD", total_before: "100", total_after: "101" }] };
        }
        return { rows: [] };
      },
    };

    const validator = backfillValidator({ pool, table: "ledger_entries" });
    await expect(validator.validateTotals(0n)).rejects.toThrow(/Totals mismatch for currencies/);
  });
});

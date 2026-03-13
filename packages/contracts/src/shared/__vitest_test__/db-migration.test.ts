import { describe, expect, it } from "vitest";

import {
  MigrationSqlSnippets,
  backfillPlan,
  backfillValidator,
  bigintColumnMigrationTemplate,
  compareSnapshots,
  datePartitionColumnDefinition,
  optimisticLockColumn,
  partitionStrategyFor,
  recommendedIndexes,
  validateBackfillStep,
  withAdvisoryLock,
} from "../db-migration";

describe("shared db migration helpers", () => {
  it("builds generated date partition column definition", () => {
    expect(datePartitionColumnDefinition("occurred_at", "date_partition")).toBe(
      "date_partition DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::date) STORED",
    );
  });

  it("builds bigint column migration template sql", () => {
    const sql = bigintColumnMigrationTemplate({
      tableName: "invoice",
      sourceMajorColumn: "amount_major",
      targetMinorColumn: "amount_minor",
      minorPerMajor: 100,
    });

    expect(sql).toContain("ALTER TABLE invoice ADD COLUMN IF NOT EXISTS amount_minor BIGINT;");
    expect(sql).toContain("ROUND(amount_major * 100)::BIGINT");
  });

  it("validates backfill rows with zero tolerance", () => {
    const result = backfillValidator([
      { key: "a", expectedMinor: 100n, actualMinor: 100n },
      { key: "b", expectedMinor: 200n, actualMinor: 199n },
    ]);

    expect(result.ok).toBe(false);
    expect(result.compared).toBe(2);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]?.key).toBe("b");
    expect(result.mismatches[0]?.deltaMinor).toBe(-1n);
  });

  it("allows tolerance in backfill validation", () => {
    const result = backfillValidator(
      [
        { key: "a", expectedMinor: 100n, actualMinor: 100n },
        { key: "b", expectedMinor: 200n, actualMinor: 199n },
      ],
      1n,
    );

    expect(result.ok).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it("provides SQL snippet templates", () => {
    expect(MigrationSqlSnippets.monthlyPartitionTemplate("audit_log")).toContain(
      "PARTITION OF audit_log",
    );
    expect(MigrationSqlSnippets.reconciliationCheckTemplate("recon_table")).toContain(
      "FROM recon_table",
    );
  });

  it("returns partition strategy by volume", () => {
    expect(partitionStrategyFor("journal_entry", "low").cadence).toBe("none");
    expect(partitionStrategyFor("journal_entry", "medium").cadence).toBe("monthly");
    expect(partitionStrategyFor("journal_entry", "high").cadence).toBe("daily");
  });

  it("suggests indexes from query shapes", () => {
    const indexes = recommendedIndexes("invoice", [
      "select * from invoice where org_id = $1 order by created_at",
      "select * from invoice where status = $1",
    ]);

    expect(indexes.map((index) => index.name)).toEqual([
      "invoice_created_at_idx",
      "invoice_org_id_idx",
      "invoice_status_idx",
    ]);
  });

  it("builds and validates backfill plan steps", () => {
    const steps = backfillPlan({ table: "invoice", addColumns: ["amount_minor"] });
    expect(steps).toHaveLength(4);
    expect(validateBackfillStep(steps[0] as (typeof steps)[number])).toEqual({ valid: true });
  });

  it("compares snapshots and reports changed keys", () => {
    const compared = compareSnapshots(
      { a: 1, b: "same", c: 3n },
      { a: 2, b: "same", c: 3n, d: true },
    );

    expect(compared.changedKeys).toEqual(["a", "d"]);
    expect(compared.unchangedKeys).toEqual(["b", "c"]);
  });

  it("returns optimistic lock column DDL", () => {
    expect(optimisticLockColumn()).toBe("version BIGINT NOT NULL DEFAULT 0");
  });

  it("runs function within advisory lock lifecycle", async () => {
    const calls: string[] = [];
    const value = await withAdvisoryLock(
      "lock-1",
      async () => {
        calls.push("fn");
        return "ok";
      },
      {
        acquire: async () => {
          calls.push("acquire");
          return true;
        },
        release: async () => {
          calls.push("release");
        },
      },
    );

    expect(value).toBe("ok");
    expect(calls).toEqual(["acquire", "fn", "release"]);
  });
});

import { datePartitionColumnDefinition as datetimeDatePartitionColumnDefinition } from "./datetime.js";

export type PartitionCadence = "none" | "monthly" | "daily";

export type PartitionStrategy = {
  table: string;
  cadence: PartitionCadence;
  targetRowsPerPartition: number;
  rationale: string;
};

export function partitionStrategyFor(
  table: string,
  volumeHint: "low" | "medium" | "high" | "extreme" = "medium",
): PartitionStrategy {
  if (!table || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error("table must be a valid SQL identifier");
  }

  if (volumeHint === "low") {
    return {
      table,
      cadence: "none",
      targetRowsPerPartition: 0,
      rationale: "single table is sufficient for low write volume",
    };
  }

  if (volumeHint === "medium") {
    return {
      table,
      cadence: "monthly",
      targetRowsPerPartition: 1_000_000,
      rationale: "monthly partitions balance maintenance and pruning",
    };
  }

  if (volumeHint === "high") {
    return {
      table,
      cadence: "daily",
      targetRowsPerPartition: 300_000,
      rationale: "daily partitions keep vacuum and index maintenance bounded",
    };
  }

  return {
    table,
    cadence: "daily",
    targetRowsPerPartition: 100_000,
    rationale: "extreme write volume benefits from tighter partition windows",
  };
}

export type RecommendedIndex = {
  name: string;
  columns: string[];
  method: "btree";
};

function sanitizeIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`invalid SQL identifier: ${value}`);
  }
  return value;
}

export function recommendedIndexes(table: string, queries: readonly string[]): RecommendedIndex[] {
  const safeTable = sanitizeIdentifier(table);
  const picks = new Set<string>();

  for (const query of queries) {
    const whereMatches = query.matchAll(/\bwhere\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    for (const match of whereMatches) {
      picks.add(sanitizeIdentifier(match[1] as string));
    }

    const orderMatches = query.matchAll(/\border\s+by\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    for (const match of orderMatches) {
      picks.add(sanitizeIdentifier(match[1] as string));
    }
  }

  return Array.from(picks)
    .sort()
    .map((column) => ({
      name: `${safeTable}_${column}_idx`,
      columns: [column],
      method: "btree" as const,
    }));
}

export type BackfillPlanStep = {
  id: string;
  phase: "prepare" | "backfill" | "validate" | "finalize";
  description: string;
};

export function backfillPlan(schemaChange: {
  table: string;
  addColumns?: string[];
  requiresRewrite?: boolean;
}): BackfillPlanStep[] {
  const safeTable = sanitizeIdentifier(schemaChange.table);
  const addColumns = (schemaChange.addColumns ?? []).map((column) => sanitizeIdentifier(column));

  const steps: BackfillPlanStep[] = [
    {
      id: `${safeTable}-prepare`,
      phase: "prepare",
      description: `add nullable target columns on ${safeTable}${addColumns.length > 0 ? ` (${addColumns.join(", ")})` : ""}`,
    },
    {
      id: `${safeTable}-backfill`,
      phase: "backfill",
      description: "backfill in bounded batches with checkpointing",
    },
    {
      id: `${safeTable}-validate`,
      phase: "validate",
      description: "compare row counts and sampled values before promoting constraints",
    },
    {
      id: `${safeTable}-finalize`,
      phase: "finalize",
      description: schemaChange.requiresRewrite
        ? "promote constraints during low-traffic window"
        : "promote defaults and constraints",
    },
  ];

  return steps;
}

export function validateBackfillStep(step: BackfillPlanStep): { valid: boolean; reason?: string } {
  if (!step.id || !step.description) {
    return { valid: false, reason: "step requires id and description" };
  }
  if (!["prepare", "backfill", "validate", "finalize"].includes(step.phase)) {
    return { valid: false, reason: "invalid step phase" };
  }
  return { valid: true };
}

export type SnapshotShape = Record<string, string | number | bigint | boolean | null | undefined>;

export function compareSnapshots(
  before: SnapshotShape,
  after: SnapshotShape,
): {
  changedKeys: string[];
  unchangedKeys: string[];
} {
  const allKeys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const changedKeys: string[] = [];
  const unchangedKeys: string[] = [];

  for (const key of allKeys) {
    if (before[key] === after[key]) {
      unchangedKeys.push(key);
    } else {
      changedKeys.push(key);
    }
  }

  changedKeys.sort();
  unchangedKeys.sort();
  return { changedKeys, unchangedKeys };
}

export function optimisticLockColumn(columnName = "version"): string {
  const safeColumn = sanitizeIdentifier(columnName);
  return `${safeColumn} BIGINT NOT NULL DEFAULT 0`;
}

export type AdvisoryLockClient = {
  acquire: (key: string | number | bigint) => Promise<boolean>;
  release: (key: string | number | bigint) => Promise<void>;
};

export async function withAdvisoryLock<T>(
  key: string | number | bigint,
  fn: () => Promise<T>,
  client?: AdvisoryLockClient,
): Promise<T> {
  if (!client) {
    return fn();
  }

  const acquired = await client.acquire(key);
  if (!acquired) {
    throw new Error("failed to acquire advisory lock");
  }

  try {
    return await fn();
  } finally {
    await client.release(key);
  }
}

export function datePartitionColumnDefinition(
  columnName = "occurred_at",
  partitionCol = "date_partition",
): string {
  return datetimeDatePartitionColumnDefinition(columnName, partitionCol);
}

export function bigintColumnMigrationTemplate(opts: {
  tableName: string;
  sourceMajorColumn: string;
  targetMinorColumn: string;
  minorPerMajor: number;
}): string {
  const { tableName, sourceMajorColumn, targetMinorColumn, minorPerMajor } = opts;
  if (!Number.isInteger(minorPerMajor) || minorPerMajor <= 0) {
    throw new Error("minorPerMajor must be a positive integer");
  }

  return [
    `-- bigint migration template for ${tableName}.${sourceMajorColumn} -> ${targetMinorColumn}`,
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${targetMinorColumn} BIGINT;`,
    `UPDATE ${tableName}`,
    `SET ${targetMinorColumn} = ROUND(${sourceMajorColumn} * ${minorPerMajor})::BIGINT`,
    `WHERE ${targetMinorColumn} IS NULL AND ${sourceMajorColumn} IS NOT NULL;`,
    `ALTER TABLE ${tableName} ALTER COLUMN ${targetMinorColumn} SET NOT NULL;`,
  ].join("\n");
}

export type BackfillValidationRow = {
  key: string;
  expectedMinor: bigint;
  actualMinor: bigint;
  currencyCode?: string;
};

export type BackfillValidationResult = {
  ok: boolean;
  compared: number;
  mismatches: Array<BackfillValidationRow & { deltaMinor: bigint }>;
};

export function backfillValidator(
  rows: BackfillValidationRow[],
  toleranceMinor = 0n,
): BackfillValidationResult {
  if (toleranceMinor < 0n) {
    throw new Error("toleranceMinor must be >= 0");
  }

  const mismatches: Array<BackfillValidationRow & { deltaMinor: bigint }> = [];
  for (const row of rows) {
    const deltaMinor = row.actualMinor - row.expectedMinor;
    const absDelta = deltaMinor < 0n ? -deltaMinor : deltaMinor;
    if (absDelta > toleranceMinor) {
      mismatches.push({ ...row, deltaMinor });
    }
  }

  return {
    ok: mismatches.length === 0,
    compared: rows.length,
    mismatches,
  };
}

export const MigrationSqlSnippets = {
  createUtcDatePartitionGeneratedColumn: datePartitionColumnDefinition,
  monthlyPartitionTemplate(tableName: string): string {
    return [
      `-- monthly partition template for ${tableName}`,
      `CREATE TABLE IF NOT EXISTS ${tableName}_y2026m01 PARTITION OF ${tableName}`,
      `FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');`,
    ].join("\n");
  },
  reconciliationCheckTemplate(
    tableName: string,
    expectedColumn = "expected_minor",
    actualColumn = "actual_minor",
  ): string {
    return [
      `-- reconciliation check for ${tableName}`,
      `SELECT COUNT(*) AS mismatches`,
      `FROM ${tableName}`,
      `WHERE ${expectedColumn} <> ${actualColumn};`,
    ].join("\n");
  },
};

export const SharedDbMigration = {
  datePartitionColumnDefinition,
  bigintColumnMigrationTemplate,
  partitionStrategyFor,
  recommendedIndexes,
  backfillPlan,
  validateBackfillStep,
  compareSnapshots,
  optimisticLockColumn,
  withAdvisoryLock,
  backfillValidator,
  MigrationSqlSnippets,
};

export default SharedDbMigration;

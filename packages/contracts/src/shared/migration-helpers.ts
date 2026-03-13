import { z } from "zod";

/**
 * Minimal query shape used by validators. Keep this interface local to contracts
 * so this module does not depend on runtime DB client packages.
 */
export type QueryablePool = {
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
};

const IdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/u, "invalid SQL identifier");

const PositiveIntSchema = z.number().int().positive();

function parseIdentifier(name: string, label: string): string {
  try {
    return IdentifierSchema.parse(name);
  } catch {
    throw new Error(`${label} must be a valid SQL identifier`);
  }
}

function parseBigIntLike(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("numeric value is not finite");
    }
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? 0n : BigInt(trimmed);
  }
  if (value == null) {
    return 0n;
  }
  throw new Error(`unsupported numeric value type: ${typeof value}`);
}

/**
 * Return a Postgres generated column definition for UTC date partitioning.
 */
export function datePartitionColumnDefinition(
  columnName = "occurred_at",
  partitionCol = "date_partition",
): string {
  const safeColumnName = parseIdentifier(columnName, "columnName");
  const safePartitionCol = parseIdentifier(partitionCol, "partitionCol");
  return `${safePartitionCol} DATE GENERATED ALWAYS AS ((${safeColumnName} AT TIME ZONE 'UTC')::date) STORED`;
}

/**
 * Template SQL for migrating a decimal amount column to bigint minor units.
 */
export function bigintColumnMigrationTemplate(
  table: string,
  oldCol = "amount",
  newCol = "amount_minor",
  currencyCol = "currency_code",
  currencyMetaTable = "currency_meta",
): string {
  const safeTable = parseIdentifier(table, "table");
  const safeOldCol = parseIdentifier(oldCol, "oldCol");
  const safeNewCol = parseIdentifier(newCol, "newCol");
  const safeCurrencyCol = parseIdentifier(currencyCol, "currencyCol");
  const safeCurrencyMetaTable = parseIdentifier(currencyMetaTable, "currencyMetaTable");

  return `
-- 1) Add new column
ALTER TABLE ${safeTable} ADD COLUMN IF NOT EXISTS ${safeNewCol} BIGINT;

-- 2) Backfill deterministic conversion using currency metadata
UPDATE ${safeTable}
SET ${safeNewCol} = ROUND(${safeTable}.${safeOldCol} * cm.minor_per_major)::bigint
FROM ${safeCurrencyMetaTable} cm
WHERE ${safeTable}.${safeCurrencyCol} = cm.code
  AND ${safeTable}.${safeNewCol} IS NULL;

-- 3) Optional: add NOT NULL after validation
-- ALTER TABLE ${safeTable} ALTER COLUMN ${safeNewCol} SET NOT NULL;
`;
}

export type BackfillValidatorOptions = {
  pool: QueryablePool;
  table: string;
  idColumn?: string;
  oldAmountCol?: string;
  newAmountCol?: string;
  currencyCol?: string;
  currencyMetaTable?: string;
  sampleLimit?: number;
};

/**
 * Build runtime validators for DB backfills.
 */
export function backfillValidator(opts: BackfillValidatorOptions) {
  const {
    pool,
    table,
    idColumn = "id",
    oldAmountCol = "amount",
    newAmountCol = "amount_minor",
    currencyCol = "currency_code",
    currencyMetaTable = "currency_meta",
    sampleLimit = 20,
  } = opts;

  const safeTable = parseIdentifier(table, "table");
  const safeIdColumn = parseIdentifier(idColumn, "idColumn");
  const safeOldAmountCol = parseIdentifier(oldAmountCol, "oldAmountCol");
  const safeNewAmountCol = parseIdentifier(newAmountCol, "newAmountCol");
  const safeCurrencyCol = parseIdentifier(currencyCol, "currencyCol");
  const safeCurrencyMetaTable = parseIdentifier(currencyMetaTable, "currencyMetaTable");
  const safeSampleLimit = PositiveIntSchema.parse(sampleLimit);

  async function validateRowCounts() {
    const beforeSql = `SELECT count(*)::bigint AS cnt_before FROM ${safeTable} WHERE ${safeOldAmountCol} IS NOT NULL`;
    const afterSql = `SELECT count(*)::bigint AS cnt_after FROM ${safeTable} WHERE ${safeNewAmountCol} IS NOT NULL`;
    const beforeRes = await pool.query(beforeSql);
    const afterRes = await pool.query(afterSql);
    const cntBefore = parseBigIntLike(beforeRes.rows[0]?.cnt_before ?? 0);
    const cntAfter = parseBigIntLike(afterRes.rows[0]?.cnt_after ?? 0);

    if (cntBefore !== cntAfter) {
      throw new Error(`Row count mismatch: before=${cntBefore} after=${cntAfter}`);
    }

    return { before: cntBefore, after: cntAfter };
  }

  async function validateTotals(toleranceMinor = 0n) {
    if (toleranceMinor < 0n) {
      throw new Error("toleranceMinor must be >= 0");
    }

    const totalsSql = `
      SELECT t.${safeCurrencyCol} AS currency,
             SUM(ROUND(t.${safeOldAmountCol} * cm.minor_per_major)::bigint) AS total_before,
             SUM(t.${safeNewAmountCol}) AS total_after
      FROM ${safeTable} t
      JOIN ${safeCurrencyMetaTable} cm ON t.${safeCurrencyCol} = cm.code
      GROUP BY t.${safeCurrencyCol}
    `;
    const res = await pool.query(totalsSql);

    const diffs: Array<{ currency: string; before: bigint; after: bigint; diff: bigint }> = [];
    for (const row of res.rows) {
      const before = parseBigIntLike(row.total_before);
      const after = parseBigIntLike(row.total_after);
      const diff = after - before;
      const absDiff = diff < 0n ? -diff : diff;
      if (absDiff > toleranceMinor) {
        diffs.push({
          currency: String(row.currency ?? ""),
          before,
          after,
          diff,
        });
      }
    }

    if (diffs.length > 0) {
      const serialized = diffs
        .map((d) => `${d.currency}: before=${d.before} after=${d.after} diff=${d.diff}`)
        .join("; ");
      throw new Error(`Totals mismatch for currencies: ${serialized}`);
    }

    return true;
  }

  async function sampleDiffs() {
    const sql = `
      SELECT t.${safeIdColumn} AS id, t.${safeCurrencyCol} AS currency, t.${safeOldAmountCol} AS old_amount, t.${safeNewAmountCol} AS new_amount,
             ROUND(t.${safeOldAmountCol} * cm.minor_per_major)::bigint AS expected_minor
      FROM ${safeTable} t
      JOIN ${safeCurrencyMetaTable} cm ON t.${safeCurrencyCol} = cm.code
      WHERE t.${safeNewAmountCol} IS NOT NULL
        AND (ROUND(t.${safeOldAmountCol} * cm.minor_per_major)::bigint) <> t.${safeNewAmountCol}
      LIMIT ${safeSampleLimit}
    `;

    const res = await pool.query(sql);
    return res.rows;
  }

  return { validateRowCounts, validateTotals, sampleDiffs };
}

export const MigrationHelpers = {
  datePartitionColumnDefinition,
  bigintColumnMigrationTemplate,
  backfillValidator,
};

export default MigrationHelpers;

/**
 * Numbering admin service — business-facing configuration of document sequences.
 *
 * This module exposes admin-safe read/write operations for sequence configuration.
 * It wraps the `sequence` table directly (not through the transactional nextNumber path).
 *
 * RULES:
 *   1. seedNextValue may only increase — gap-free constraint enforced at service level.
 *   2. Uses ensureSequence for idempotent upsert.
 *   3. This service does NOT touch org_setting.
 */

import type { DbClient } from "@afenda/db";
import { sequence } from "@afenda/db";
import { eq } from "drizzle-orm";
import type { OrgId, NumberingConfigEntry, SequenceEntityType } from "@afenda/contracts";
import { ensureSequence } from "./numbering";

/** List all configured sequences for an org. */
export async function listNumberingConfigs(
  db: DbClient,
  orgId: OrgId,
): Promise<NumberingConfigEntry[]> {
  const rows = await db
    .select({
      entityType: sequence.entityType,
      prefix: sequence.prefix,
      padWidth: sequence.padWidth,
      nextValue: sequence.nextValue,
      periodKey: sequence.periodKey,
    })
    .from(sequence)
    .where(eq(sequence.orgId, orgId))
    .orderBy(sequence.entityType, sequence.periodKey);

  return rows.map((r) => ({
    entityType: r.entityType as SequenceEntityType,
    prefix: r.prefix,
    padWidth: r.padWidth,
    nextValue: r.nextValue,
    periodKey: r.periodKey,
  }));
}

/**
 * Update a sequence config for an entity type.
 *
 * @throws If seedNextValue < current nextValue (gap-free constraint).
 */
export async function updateNumberingConfig(
  db: DbClient,
  orgId: OrgId,
  params: {
    entityType: SequenceEntityType;
    prefix?: string;
    padWidth?: number;
    seedNextValue?: number;
  },
): Promise<void> {
  const { entityType, prefix, padWidth, seedNextValue } = params;

  // Read current row to validate seed constraint
  const rows = await db
    .select({ prefix: sequence.prefix, padWidth: sequence.padWidth, nextValue: sequence.nextValue })
    .from(sequence)
    .where(eq(sequence.orgId, orgId))
    .limit(1);

  const existing = rows[0];

  if (seedNextValue !== undefined && existing && seedNextValue < existing.nextValue) {
    throw new Error(
      `CFG_NUMBERING_SEED_DECREASE: seedNextValue (${seedNextValue}) must be >= current nextValue (${existing.nextValue}) — gap-free sequences may not decrease`,
    );
  }

  await ensureSequence(db, {
    orgId,
    entityType,
    periodKey: "",
    prefix: prefix ?? existing?.prefix ?? entityType.toUpperCase().slice(0, 4) + "-",
    padWidth: padWidth ?? existing?.padWidth ?? 4,
    startValue: seedNextValue ?? existing?.nextValue ?? 1,
  });
}

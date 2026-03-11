/**
 * Settings service — atomic upsert with per-key validation and audit.
 *
 * Validation order (enforced before transaction begins):
 *   1. Unknown key → CFG_SETTING_KEY_UNKNOWN (400)
 *   2. Invalid value per SETTING_VALUE_SCHEMAS → CFG_SETTING_INVALID_VALUE (400)
 *   3. Immutable key (mutable: false) → SHARED_FORBIDDEN (403) — future use
 *
 * Transaction order:
 *   1. Delete rows where value === null (clear override → fall back to default)
 *   2. Upsert rows where value !== null
 *   3. Write one audit_log row with changedKeys + categories in details
 *   4. Commit — all-or-nothing
 *
 * Returns effective values for the updated keys only (not the full object).
 */
import { eq, and, inArray } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { orgSetting } from "@afenda/db";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  SettingKey,
  SettingsSliceResponse,
  SettingValueResponse,
} from "@afenda/contracts";
import { SettingKeyValues } from "@afenda/contracts";
import { writeAuditLog, type OrgScopedContext } from "../audit/index";
import { SETTING_REGISTRY } from "./settings.registry";
import { SETTING_VALUE_SCHEMAS } from "./settings.value-schemas";
import { getEffectiveSettings } from "./settings.queries";

// ── Domain error ──────────────────────────────────────────────────────────────

export class SettingsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldPath?: string,
  ) {
    super(message);
    this.name = "SettingsError";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingPatch = { key: SettingKey; value: unknown };

// ── Validation (pre-transaction) ──────────────────────────────────────────────

function validateUpdates(updates: SettingPatch[]): void {
  const knownKeys = new Set<string>(SettingKeyValues);

  for (const { key, value } of updates) {
    if (!knownKeys.has(key)) {
      throw new SettingsError(
        "CFG_SETTING_KEY_UNKNOWN",
        `Unknown setting key: "${key}"`,
        `updates[key]`,
      );
    }

    // null means "clear override" — skip value validation
    if (value === null) continue;

    const def = SETTING_REGISTRY[key];
    if (!def.mutable) {
      throw new SettingsError(
        "SHARED_FORBIDDEN",
        `Setting "${key}" is read-only`,
        `updates[key]`,
      );
    }

    const schema = SETTING_VALUE_SCHEMAS[key];
    const result = schema.safeParse(value);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? "Invalid value";
      throw new SettingsError(
        "CFG_SETTING_INVALID_VALUE",
        `Invalid value for "${key}": ${msg}`,
        `updates[key=${key}].value`,
      );
    }
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Atomically upsert one or more settings for an org.
 *
 * @returns Effective values for the updated keys only.
 */
export async function upsertSettings(
  db: DbClient,
  orgId: OrgId,
  updates: SettingPatch[],
  actorPrincipalId: PrincipalId,
  correlationId: CorrelationId,
): Promise<SettingsSliceResponse> {
  // Validate all updates before touching the DB
  validateUpdates(updates);

  const keysToDelete = updates.filter((u) => u.value === null).map((u) => u.key);
  const keysToUpsert = updates.filter((u) => u.value !== null);
  const changedKeys = updates.map((u) => u.key);

  // Deduplicated categories for audit details
  const categories = [
    ...new Set(changedKeys.map((k) => SETTING_REGISTRY[k].category)),
  ];

  const ctx: OrgScopedContext = { activeContext: { orgId } };

  await db.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;

    // 1. Delete cleared overrides
    if (keysToDelete.length > 0) {
      await txDb
        .delete(orgSetting)
        .where(
          and(
            eq(orgSetting.orgId, orgId),
            inArray(orgSetting.key, keysToDelete as string[]),
          ),
        );
    }

    // 2. Upsert non-null values
    for (const { key, value } of keysToUpsert) {
      await txDb
        .insert(orgSetting)
        .values({
          orgId,
          key,
          valueJson: value,
          updatedBy: actorPrincipalId,
        })
        .onConflictDoUpdate({
          target: [orgSetting.orgId, orgSetting.key],
          set: {
            valueJson: value,
            updatedBy: actorPrincipalId,
          },
        });
    }

    // 3. Write audit row (inside transaction — atomic with the writes)
    await writeAuditLog(txDb, ctx, {
      actorPrincipalId,
      action: "settings.updated",
      entityType: "setting",
      entityId: undefined,
      correlationId,
      details: {
        changedKeys,
        categories,
        keyCount: changedKeys.length,
      },
    });
  });

  // Return effective values for the updated keys only
  const slice = await getEffectiveSettings(db, orgId, changedKeys);

  const result: Record<string, SettingValueResponse> = {};
  for (const key of changedKeys) {
    result[key] = slice[key as keyof typeof slice];
  }
  return result as SettingsSliceResponse;
}

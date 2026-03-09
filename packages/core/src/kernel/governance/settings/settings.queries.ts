/**
 * Settings read queries — raw fetch and effective-value merge.
 *
 * getEffectiveSettings() is the public API surface.
 * getSettingsRaw() is internal; not exposed via API routes.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { orgSetting } from "@afenda/db";
import type { OrgId, SettingKey, SettingsResponse, SettingValueResponse, JsonValue } from "@afenda/contracts";
import { SettingKeyValues } from "@afenda/contracts";
import { SETTING_REGISTRY } from "./settings.registry.js";

// ── Raw fetch (internal) ──────────────────────────────────────────────────────

export async function getSettingsRaw(
  db: DbClient,
  orgId: OrgId,
): Promise<{ key: string; valueJson: unknown }[]> {
  return db
    .select({ key: orgSetting.key, valueJson: orgSetting.valueJson })
    .from(orgSetting)
    .where(eq(orgSetting.orgId, orgId));
}

// ── Effective settings (public) ───────────────────────────────────────────────

/**
 * Returns effective setting values for the org.
 * Merges system defaults with persisted org overrides.
 * Secret keys return value: "***" regardless of stored value.
 *
 * @param keys — filter to specific keys; omit to return all known keys.
 */
export async function getEffectiveSettings(
  db: DbClient,
  orgId: OrgId,
  keys?: SettingKey[],
): Promise<SettingsResponse> {
  const targetKeys: SettingKey[] = keys ?? [...SettingKeyValues];

  // Fetch only the org's stored overrides for the requested keys
  const rows =
    targetKeys.length > 0
      ? await db
          .select({ key: orgSetting.key, valueJson: orgSetting.valueJson })
          .from(orgSetting)
          .where(
            and(
              eq(orgSetting.orgId, orgId),
              inArray(orgSetting.key, targetKeys as string[]),
            ),
          )
      : [];

  const storedMap = new Map(rows.map((r) => [r.key, r.valueJson]));

  const result: Record<string, SettingValueResponse> = {};

  for (const key of targetKeys) {
    const def = SETTING_REGISTRY[key];
    const stored = storedMap.has(key);
    const rawValue: JsonValue = stored
      ? (storedMap.get(key) as JsonValue) ?? null
      : (def.defaultValue as JsonValue);
    result[key] = {
      value: def.secret ? "***" : rawValue,
      source: stored ? "stored" : "default",
    };
  }

  return result as SettingsResponse;
}

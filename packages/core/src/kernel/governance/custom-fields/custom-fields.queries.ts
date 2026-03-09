/**
 * Custom fields query functions.
 *
 * Two query surfaces:
 *   getCustomFieldDefs    — lists definitions for an org (admin surface)
 *   getCustomFieldValues  — fetches per-entity values (domain read surface)
 *
 * getCustomFieldValues is called by entity services when building read responses.
 * The result is keyed by api_key for direct embedding as `customFields` payload.
 */
import { eq, and, inArray } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { customFieldDef, customFieldValue } from "@afenda/db";
import type {
  CustomFieldEntityType,
  CustomFieldDefResponse,
  CustomFieldValuesResponse,
  JsonValue,
} from "@afenda/contracts";

// ── List field definitions ────────────────────────────────────────────────────

export async function getCustomFieldDefs(
  db: DbClient,
  orgId: string,
  options?: {
    entityType?: CustomFieldEntityType;
    includeInactive?: boolean;
  },
): Promise<CustomFieldDefResponse[]> {
  const rows = await db
    .select()
    .from(customFieldDef)
    .where(
      and(
        eq(customFieldDef.orgId, orgId),
        options?.entityType ? eq(customFieldDef.entityType, options.entityType) : undefined,
        options?.includeInactive ? undefined : eq(customFieldDef.active, true),
      ),
    )
    .orderBy(customFieldDef.sortOrder, customFieldDef.createdAt);

  return rows.map((r) => ({
    id: r.id,
    entityType: r.entityType as CustomFieldEntityType,
    label: r.label,
    apiKey: r.apiKey,
    dataType: r.dataType as CustomFieldDefResponse["dataType"],
    optionsJson: (r.optionsJson as CustomFieldDefResponse["optionsJson"]) ?? null,
    required: r.required,
    active: r.active,
    sortOrder: r.sortOrder,
    helpText: r.helpText ?? null,
    defaultValueJson: (r.defaultValueJson as CustomFieldDefResponse["defaultValueJson"]) ?? null,
    showInPdf: r.showInPdf,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ── Fetch definition by ID ────────────────────────────────────────────────────

export async function getCustomFieldDefById(
  db: DbClient,
  orgId: string,
  defId: string,
): Promise<CustomFieldDefResponse | null> {
  const [row] = await db
    .select()
    .from(customFieldDef)
    .where(and(eq(customFieldDef.orgId, orgId), eq(customFieldDef.id, defId)));

  if (!row) return null;

  return {
    id: row.id,
    entityType: row.entityType as CustomFieldEntityType,
    label: row.label,
    apiKey: row.apiKey,
    dataType: row.dataType as CustomFieldDefResponse["dataType"],
    optionsJson: (row.optionsJson as CustomFieldDefResponse["optionsJson"]) ?? null,
    required: row.required,
    active: row.active,
    sortOrder: row.sortOrder,
    helpText: row.helpText ?? null,
    defaultValueJson: (row.defaultValueJson as CustomFieldDefResponse["defaultValueJson"]) ?? null,
    showInPdf: row.showInPdf,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Fetch custom field values for a specific entity ───────────────────────────
// Returns Record<apiKey, value | null> — keyed by api_key for direct embedding
// in entity read responses as `customFields`.

export async function getCustomFieldValues(
  db: DbClient,
  orgId: string,
  entityType: CustomFieldEntityType,
  entityId: string,
): Promise<CustomFieldValuesResponse> {
  // Fetch all active definitions for this entity type
  const defs = await db
    .select({ id: customFieldDef.id, apiKey: customFieldDef.apiKey })
    .from(customFieldDef)
    .where(
      and(
        eq(customFieldDef.orgId, orgId),
        eq(customFieldDef.entityType, entityType),
        eq(customFieldDef.active, true),
      ),
    );

  if (defs.length === 0) return {};

  const defIds = defs.map((d) => d.id);

  const values = await db
    .select()
    .from(customFieldValue)
    .where(
      and(
        eq(customFieldValue.orgId, orgId),
        eq(customFieldValue.entityType, entityType),
        eq(customFieldValue.entityId, entityId),
        inArray(customFieldValue.fieldDefId, defIds),
      ),
    );

  // Build a map from defId → value
  const valueMap = new Map(values.map((v) => [v.fieldDefId, (v.valueJson ?? null) as JsonValue | null]));

  // Build result keyed by api_key (null = no stored value)
  const result: CustomFieldValuesResponse = {};
  for (const def of defs) {
    result[def.apiKey] = valueMap.get(def.id) ?? null;
  }
  return result;
}

// ── Fetch definitions keyed by api_key (used by value upsert service) ────────

export async function getCustomFieldDefsByApiKeys(
  db: DbClient,
  orgId: string,
  entityType: CustomFieldEntityType,
  apiKeys: string[],
): Promise<Map<string, { id: string; dataType: string; optionsJson: unknown; required: boolean }>> {
  if (apiKeys.length === 0) return new Map();

  const rows = await db
    .select()
    .from(customFieldDef)
    .where(
      and(
        eq(customFieldDef.orgId, orgId),
        eq(customFieldDef.entityType, entityType),
        eq(customFieldDef.active, true),
        inArray(customFieldDef.apiKey, apiKeys),
      ),
    );

  return new Map(
    rows.map((r) => [
      r.apiKey,
      { id: r.id, dataType: r.dataType, optionsJson: r.optionsJson, required: r.required },
    ]),
  );
}

/**
 * Custom fields service - definition management and value upsert.
 *
 * Two distinct concerns:
 *
 *   1. Definition management (admin/kernel surface):
 *      createCustomFieldDef, updateCustomFieldDef, deleteCustomFieldDef
 *      -> writes to custom_field_def only
 *      -> audited as governance events
 *
 *   2. Value upsert (entity-domain surface):
 *      upsertCustomFieldValues
 *      -> writes to custom_field_value only
 *      -> called from entity route handlers, NOT from definition API
 *
 * Hard boundary: this service never mixes the two concerns in a single transaction.
 */
import { eq, and, sql } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { customFieldDef, customFieldValue } from "@afenda/db";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  EntityId,
  CustomFieldEntityType,
  CreateCustomFieldDefCommand,
  UpdateCustomFieldDefCommand,
  UpsertCustomFieldValuesCommand,
  CustomFieldDefResponse,
  CustomFieldValuesResponse,
} from "@afenda/contracts";
import { CustomFieldEntityTypeValues } from "@afenda/contracts";
import { writeAuditLog, type OrgScopedContext } from "../audit/index";
import {
  getCustomFieldDefById,
  getCustomFieldDefs,
  getCustomFieldDefsByApiKeys,
} from "./custom-fields.queries";

// -- Domain error --------------------------------------------------------------

export class CustomFieldError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldPath?: string,
  ) {
    super(message);
    this.name = "CustomFieldError";
  }
}

// -- Internal helpers ----------------------------------------------------------

function makeCtx(orgId: OrgId): OrgScopedContext {
  return { activeContext: { orgId } };
}

function assertEntityTypeKnown(entityType: string): asserts entityType is CustomFieldEntityType {
  if (!(CustomFieldEntityTypeValues as readonly string[]).includes(entityType)) {
    throw new CustomFieldError(
      "CFG_CUSTOM_FIELD_ENTITY_TYPE_UNKNOWN",
      `Unknown entity type: ${entityType}`,
      "entityType",
    );
  }
}

function validateValueForDataType(
  value: unknown,
  dataType: string,
  optionsJson: unknown,
  apiKey: string,
): void {
  if (value === null || value === undefined) return;

  switch (dataType) {
    case "text":
      if (typeof value !== "string") {
        throw new CustomFieldError(
          "CFG_CUSTOM_FIELD_INVALID_VALUE",
          `Field "${apiKey}" expects a text value`,
          `customFields.${apiKey}`,
        );
      }
      break;
    case "number":
      if (typeof value !== "number") {
        throw new CustomFieldError(
          "CFG_CUSTOM_FIELD_INVALID_VALUE",
          `Field "${apiKey}" expects a numeric value`,
          `customFields.${apiKey}`,
        );
      }
      break;
    case "checkbox":
      if (typeof value !== "boolean") {
        throw new CustomFieldError(
          "CFG_CUSTOM_FIELD_INVALID_VALUE",
          `Field "${apiKey}" expects a boolean value`,
          `customFields.${apiKey}`,
        );
      }
      break;
    case "date":
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new CustomFieldError(
          "CFG_CUSTOM_FIELD_INVALID_VALUE",
          `Field "${apiKey}" expects a date string in YYYY-MM-DD format`,
          `customFields.${apiKey}`,
        );
      }
      break;
    case "dropdown": {
      const options = optionsJson as Array<{ value: string; active?: boolean }> | null;
      const activeValues = (options ?? []).filter((o) => o.active !== false).map((o) => o.value);
      if (!activeValues.includes(value as string)) {
        throw new CustomFieldError(
          "CFG_CUSTOM_FIELD_INVALID_VALUE",
          `Field "${apiKey}" value must be one of: ${activeValues.join(", ")}`,
          `customFields.${apiKey}`,
        );
      }
      break;
    }
  }
}

// -- Definition management -----------------------------------------------------

export async function createCustomFieldDef(
  db: DbClient,
  orgId: OrgId,
  command: CreateCustomFieldDefCommand,
  principalId: PrincipalId,
  correlationId: CorrelationId,
): Promise<CustomFieldDefResponse> {
  assertEntityTypeKnown(command.entityType);

  if (command.dataType === "dropdown" && (!command.options || command.options.length === 0)) {
    throw new CustomFieldError(
      "CFG_CUSTOM_FIELD_INVALID_VALUE",
      "Dropdown fields must have at least one option",
      "options",
    );
  }

  let createdId: string | undefined;

  await db.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;

    const [row] = await txDb
      .insert(customFieldDef)
      .values({
        orgId,
        entityType: command.entityType,
        label: command.label,
        apiKey: command.apiKey,
        dataType: command.dataType,
        optionsJson: command.options ?? null,
        required: command.required ?? false,
        active: true,
        sortOrder: command.sortOrder ?? 0,
        helpText: command.helpText ?? null,
        defaultValueJson: command.defaultValue ?? null,
        showInPdf: command.showInPdf ?? false,
        createdBy: principalId,
      })
      .returning({ id: customFieldDef.id });

    if (!row) throw new Error("custom_field_def insert returned no row");
    createdId = row.id;

    await writeAuditLog(txDb, makeCtx(orgId), {
      actorPrincipalId: principalId,
      action: "custom-fields.created",
      entityType: "custom_field_def",
      entityId: row.id as EntityId,
      correlationId,
      details: {
        label: command.label,
        apiKey: command.apiKey,
        entityType: command.entityType,
        dataType: command.dataType,
      },
    });
  });

  return (await getCustomFieldDefById(db, orgId, createdId!)) as CustomFieldDefResponse;
}

export async function updateCustomFieldDef(
  db: DbClient,
  orgId: OrgId,
  defId: string,
  command: UpdateCustomFieldDefCommand,
  principalId: PrincipalId,
  correlationId: CorrelationId,
): Promise<CustomFieldDefResponse> {
  // Enforce immutability of api_key and entity_type.
  // These fields are captured (not stripped) by the schema so clients receive an
  // explicit 409 rather than a silent no-op.
  if (command.apiKey !== undefined || command.entityType !== undefined) {
    throw new CustomFieldError(
      "CFG_CUSTOM_FIELD_KEY_IMMUTABLE",
      "api_key and entity_type cannot be changed after creation",
    );
  }

  const existing = await getCustomFieldDefById(db, orgId, defId);
  if (!existing) {
    throw new CustomFieldError("CFG_CUSTOM_FIELD_NOT_FOUND", `Custom field def ${defId} not found`);
  }

  // Enforce immutability of option values.
  // The value inside each CustomFieldOption is a schema identifier — it is what
  // gets stored in custom_field_value.value_json. Only label, active, and
  // sortOrder may change. Removing an existing option value is rejected.
  if (command.options !== undefined && existing.optionsJson && existing.optionsJson.length > 0) {
    const existingValues = new Set(existing.optionsJson.map((o) => o.value));
    const newValues = new Set(command.options.map((o) => o.value));
    const removed = [...existingValues].filter((v) => !newValues.has(v));
    if (removed.length > 0) {
      throw new CustomFieldError(
        "CFG_CUSTOM_FIELD_INVALID_VALUE",
        `Option value(s) are immutable after creation and cannot be removed: ${removed.join(", ")}. Update label or sortOrder instead.`,
        "options",
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (command.label !== undefined) updates.label = command.label;
  if (command.options !== undefined) updates.optionsJson = command.options;
  if (command.required !== undefined) updates.required = command.required;
  if ("helpText" in command) updates.helpText = command.helpText;
  if ("defaultValue" in command) updates.defaultValueJson = command.defaultValue;
  if (command.showInPdf !== undefined) updates.showInPdf = command.showInPdf;
  if (command.sortOrder !== undefined) updates.sortOrder = command.sortOrder;
  if (command.active !== undefined) updates.active = command.active;

  await db.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;

    await txDb
      .update(customFieldDef)
      .set(updates)
      .where(and(eq(customFieldDef.orgId, orgId), eq(customFieldDef.id, defId)));

    await writeAuditLog(txDb, makeCtx(orgId), {
      actorPrincipalId: principalId,
      action: "custom-fields.updated",
      entityType: "custom_field_def",
      entityId: defId as EntityId,
      correlationId,
      details: { changedFields: Object.keys(updates) },
    });
  });

  return (await getCustomFieldDefById(db, orgId, defId)) as CustomFieldDefResponse;
}

export async function deleteCustomFieldDef(
  db: DbClient,
  orgId: OrgId,
  defId: string,
  principalId: PrincipalId,
  correlationId: CorrelationId,
): Promise<void> {
  const existing = await getCustomFieldDefById(db, orgId, defId);
  if (!existing) {
    throw new CustomFieldError("CFG_CUSTOM_FIELD_NOT_FOUND", `Custom field def ${defId} not found`);
  }

  // Check if any values exist for this definition
  const [valueCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customFieldValue)
    .where(eq(customFieldValue.fieldDefId, defId));

  const hasValues = valueCount && valueCount.count > 0;

  await db.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;

    if (hasValues) {
      // Soft-deactivate - values reference this definition, hard delete would cascade
      await txDb
        .update(customFieldDef)
        .set({ active: false })
        .where(and(eq(customFieldDef.orgId, orgId), eq(customFieldDef.id, defId)));

      await writeAuditLog(txDb, makeCtx(orgId), {
        actorPrincipalId: principalId,
        action: "custom-fields.deactivated",
        entityType: "custom_field_def",
        entityId: defId as EntityId,
        correlationId,
        details: { reason: "has_values" },
      });
    } else {
      await txDb
        .delete(customFieldDef)
        .where(and(eq(customFieldDef.orgId, orgId), eq(customFieldDef.id, defId)));

      await writeAuditLog(txDb, makeCtx(orgId), {
        actorPrincipalId: principalId,
        action: "custom-fields.deleted",
        entityType: "custom_field_def",
        entityId: defId as EntityId,
        correlationId,
        details: {},
      });
    }
  });
}

// Re-export list query
export { getCustomFieldDefs };

// -- Value upsert (entity-domain surface) -------------------------------------

export async function upsertCustomFieldValues(
  db: DbClient,
  orgId: OrgId,
  entityType: CustomFieldEntityType,
  entityId: string,
  command: UpsertCustomFieldValuesCommand,
  principalId: PrincipalId,
  correlationId: CorrelationId,
): Promise<CustomFieldValuesResponse> {
  assertEntityTypeKnown(entityType);

  const apiKeys = command.values.map((v) => v.apiKey);
  const defMap = await getCustomFieldDefsByApiKeys(db, orgId, entityType, apiKeys);

  // Validate all api_keys exist and are active
  const unknownKeys = apiKeys.filter((k) => !defMap.has(k));
  if (unknownKeys.length > 0) {
    throw new CustomFieldError(
      "CFG_CUSTOM_FIELD_NOT_FOUND",
      `Unknown custom field api_key(s): ${unknownKeys.join(", ")}`,
    );
  }

  // Validate values per data_type
  for (const entry of command.values) {
    const def = defMap.get(entry.apiKey)!;
    validateValueForDataType(entry.value, def.dataType, def.optionsJson, entry.apiKey);
  }

  await db.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;

    for (const entry of command.values) {
      const def = defMap.get(entry.apiKey)!;

      if (entry.value === null) {
        await txDb
          .delete(customFieldValue)
          .where(
            and(
              eq(customFieldValue.fieldDefId, def.id),
              eq(customFieldValue.entityId, entityId),
            ),
          );
      } else {
        await txDb
          .insert(customFieldValue)
          .values({
            orgId,
            fieldDefId: def.id,
            entityType,
            entityId,
            valueJson: entry.value,
            updatedAt: sql`now()`,
            updatedBy: principalId,
          })
          .onConflictDoUpdate({
            target: [customFieldValue.orgId, customFieldValue.fieldDefId, customFieldValue.entityId],
            set: {
              valueJson: entry.value,
              updatedAt: sql`now()`,
              updatedBy: principalId,
            },
          });
      }
    }

    await writeAuditLog(txDb, makeCtx(orgId), {
      actorPrincipalId: principalId,
      action: "custom-fields.values.updated",
      entityType: "custom_field_value",
      entityId: entityId as EntityId,
      correlationId,
      details: {
        entityType,
        entityId,
        updatedKeys: apiKeys,
        keyCount: apiKeys.length,
      },
    });
  });

  const result: CustomFieldValuesResponse = {};
  for (const entry of command.values) {
    result[entry.apiKey] = entry.value;
  }
  return result;
}

export { getCustomFieldValues } from "./custom-fields.queries";


/**
 * OrgSetting entity DTO — mirrors the `org_setting` DB table.
 *
 * RULES:
 *   1. `valueJson` is intentionally untyped here (JsonValueSchema). Type safety
 *      is enforced at service boundary by the per-key SETTING_VALUE_SCHEMAS map.
 *   2. `updatedByPrincipalId` is nullable — null for system-initiated changes.
 *   3. No `createdAt` / `createdBy` — the audit_log is the history trail.
 */
import { z } from "zod";
import { UuidSchema, OrgIdSchema, PrincipalIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { JsonValueSchema } from "../../execution/outbox/envelope.js";

export const OrgSettingSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  key: z.string().min(1),
  valueJson: JsonValueSchema,
  updatedAt: UtcDateTimeSchema,
  updatedByPrincipalId: PrincipalIdSchema.nullable(),
});

export type OrgSetting = z.infer<typeof OrgSettingSchema>;

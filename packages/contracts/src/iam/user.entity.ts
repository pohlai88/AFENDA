/**
 * User entity and request-context schemas.
 *
 * RULES:
 *   1. All IDs use branded schemas from `shared/ids` — never raw `z.string().uuid()`.
 *   2. `permissions` is `PermissionKeySchema[]` — never `z.string()[]`. Free-form
 *      permission strings defeat the canonical registry in `role.entity.ts`.
 *   3. All timestamps are UTC (Z suffix enforced).
 *   4. `RequestContextSchema` is claims-only — no embedded User or Tenant objects.
 *      It must remain cheap to pass across service/process boundaries.
 *   5. Duplicate roles/permissions are removed at parse time via `.transform()`.
 *
 * ADR-0003 MIGRATION COMPLETE:
 *   - `principalId` is the authenticated actor (Token.sub)
 *   - `activeContext` carries the current "hat" (partyRoleId + orgId)
 */
import { z } from "zod";
import {
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../shared/ids.js";
import { RoleKeySchema, PermissionKeySchema } from "./role.entity.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";
import { ActiveContextSchema } from "./membership.entity.js";


// ─── User entity ──────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id:        PrincipalIdSchema,
  email:     z.string().email(),
  /** Display name — trimmed; `null` when the user has not set one yet. */
  name:      z.string().trim().min(1).nullable(),
  createdAt: UtcDateTimeSchema,
});

export type User = z.infer<typeof UserSchema>;

// ─── Request context (claims-only) ───────────────────────────────────────────

/**
 * What the API middleware injects into every request after verifying the
 * JWT / session. Derived from headers and token claims only — no DB lookups.
 *
 * ADR-0003 complete:
 *   - `principalId` is the authenticated actor (Token.sub)
 *   - `activeContext` is the currently selected "hat" (partyRoleId + orgId)
 *
 * Duplicate role/permission entries are removed at parse time.
 * `permissionsSet` is auto-computed for O(1) permission checks.
 */
export const RequestContextSchema = z.object({
  // ─── Identity (ADR-0003) ───────────────────────────────────────────────────
  principalId:   PrincipalIdSchema,
  activeContext: ActiveContextSchema.optional(),

  // ─── RBAC ──────────────────────────────────────────────────────────────────
  roles:         z.array(RoleKeySchema).transform((arr) => [...new Set(arr)]),
  permissions:   z.array(PermissionKeySchema).transform((arr) => [...new Set(arr)]),

  // ─── Tracing ───────────────────────────────────────────────────────────────
  correlationId: CorrelationIdSchema,
}).transform((data) => ({
  ...data,
  /** O(1) permission check — auto-computed from `permissions` array */
  permissionsSet: new Set(data.permissions) as ReadonlySet<string>,
}));

export type RequestContext = z.infer<typeof RequestContextSchema>;


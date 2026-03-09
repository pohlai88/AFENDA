/**
 * Role type controlled vocabulary (ADR-0003).
 *
 * RULES:
 *   1. RoleType is NOT a permission or RBAC role — it's a business relationship type.
 *   2. "employee", "customer", "supplier" etc. describe what hat a party wears
 *      in relation to an organization.
 *   3. Add new role types here when onboarding a new party relationship model.
 *   4. This is a controlled vocab (const array + union type), NOT a Zod enum,
 *      so that DB enum sync gates can verify alignment.
 */

/**
 * Canonical role types — describes the business relationship between
 * a party and an organization.
 *
 * Examples:
 *   - "employee": works for the org
 *   - "supplier": sells goods/services to the org
 *   - "customer": buys from the org
 *   - "shareholder": owns equity in the org
 *   - "investor": external capital relationship
 *   - "franchisee": operates a franchise of the org
 *   - "franchisor": grants franchise rights to the org
 */
export const RoleTypeValues = [
  "employee",
  "shareholder",
  "customer",
  "supplier",
  "investor",
  "franchisee",
  "franchisor",
  // future:
  // "contractor",
  // "auditor",
  // "advisor",
] as const;

export type RoleType = (typeof RoleTypeValues)[number];

/**
 * Type guard to check if a string is a valid RoleType.
 */
export function isRoleType(value: string): value is RoleType {
  return RoleTypeValues.includes(value as RoleType);
}

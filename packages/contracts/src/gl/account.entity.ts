/**
 * GL account entity.
 *
 * RULES:
 *   1. `AccountTypeValues` is `as const` — import it in `@afenda/db` for the
 *      Postgres enum; never duplicate the list.
 *   2. `id` uses `AccountIdSchema` (branded UUID from shared/ids).
 *   3. `code` enforces a pragmatic Day-1 format (A-Z, 0-9, dot, hyphen, 1-32 chars).
 *      Naming policy ("1000-1999 are current assets") belongs in core/config.
 *   4. Accounts are deactivated, not deleted — `isActive` controls posting eligibility.
 *      Posting guards (account active + period open) live in `@afenda/core`.
 */
import { z } from "zod";
import { AccountIdSchema, OrgIdSchema } from "../shared/ids.js";
import { UtcDateTimeSchema } from "../shared/datetime.js";

/**
 * Account type values as a const tuple — import in @afenda/db:
 * pgEnum('account_type', AccountTypeValues)
 */
export const AccountTypeValues = ["asset", "liability", "equity", "revenue", "expense"] as const;

export const AccountTypeSchema = z.enum(AccountTypeValues);

export type AccountType = z.infer<typeof AccountTypeSchema>;

/**
 * GL account code — pragmatic Day-1 constraint.
 * Enforces: uppercase letters, digits, dot, hyphen; 1–32 chars.
 * Format policy (e.g. "1000-1999 are current assets") belongs in core/config.
 */
export const AccountCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9.-]+$/, "code must be A-Z, 0-9, dot, or hyphen");

export type AccountCode = z.infer<typeof AccountCodeSchema>;

export const AccountSchema = z.object({
  id: AccountIdSchema,
  orgId: OrgIdSchema,

  code: AccountCodeSchema,
  name: z.string().trim().min(1).max(255),

  type: AccountTypeSchema,
  isActive: z.boolean(),

  createdAt: UtcDateTimeSchema,
  // Accounts are renamed and deactivated — track mutations.
  updatedAt: UtcDateTimeSchema,
});

export type Account = z.infer<typeof AccountSchema>;

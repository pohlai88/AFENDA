/**
 * Treasury test builders — factory helpers for test fixtures.
 *
 * Pattern (mirrors AP conventions):
 *   - Return minimal valid objects by default
 *   - Accept partial overrides via spread
 *   - Use `crypto.randomUUID()` for IDs — never hardcode
 *   - Use literal date strings for timestamps, not `new Date()`
 *
 * Usage:
 *   const cmd = buildTreasuryBaseCommand({ orgId: "fixed-org-id" });
 */
import type { TreasuryBaseCommand } from "@afenda/contracts";

// ── Base command builder ───────────────────────────────────────────────────────

export function buildTreasuryBaseCommand(
  overrides: Partial<TreasuryBaseCommand> = {},
): TreasuryBaseCommand {
  return {
    idempotencyKey: crypto.randomUUID(),
    orgId: crypto.randomUUID(),
    ...overrides,
  };
}

// ── Wave 1+ builders added here as entities are implemented ───────────────────
//
// Example (Sprint 1.1):
//   export function buildCreateBankAccountCommand(
//     overrides: Partial<CreateBankAccountCommand> = {},
//   ): CreateBankAccountCommand {
//     return {
//       ...buildTreasuryBaseCommand(),
//       name: "Demo Checking Account",
//       currencyCode: "USD",
//       iban: null,
//       accountNumber: "123456789",
//       routingNumber: "021000021",
//       bankId: crypto.randomUUID(),
//       ...overrides,
//     };
//   }

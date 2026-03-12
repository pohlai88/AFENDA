/**
 * Intercompany balancing calculator
 * Ensures all transfers preserve double-entry invariants
 */

export interface IntercompanyBalancingParams {
  transferAmountMinor: string;
  debitLegAmountMinor: string;
  creditLegAmountMinor: string;
}

/**
 * Assert that debit and credit legs balance to the transfer amount
 * Throws if balance is violated
 */
export function assertBalancedTransfer(params: IntercompanyBalancingParams): void {
  const transfer = BigInt(params.transferAmountMinor);
  const debit = BigInt(params.debitLegAmountMinor);
  const credit = BigInt(params.creditLegAmountMinor);

  if (debit !== transfer) {
    throw new Error(
      `TREASURY_INTERCOMPANY_TRANSFER_DEBIT_MISMATCH: debit ${debit} does not match transfer ${transfer}`
    );
  }

  if (credit !== transfer) {
    throw new Error(
      `TREASURY_INTERCOMPANY_TRANSFER_CREDIT_MISMATCH: credit ${credit} does not match transfer ${transfer}`
    );
  }

  if (debit + credit !== transfer * BigInt(2)) {
    throw new Error(
      `TREASURY_INTERCOMPANY_TRANSFER_UNBALANCED: total legs ${debit + credit} do not equal 2x transfer ${transfer * BigInt(2)}`
    );
  }
}

/**
 * Calculate balanced debit/credit legs from transfer amount
 * Both legs equal the transfer amount in a simple bilateral transfer
 */
export function calculateBalancedLegs(
  transferAmountMinor: string
): {
  debitLegAmountMinor: string;
  creditLegAmountMinor: string;
} {
  const amount = BigInt(transferAmountMinor);

  if (amount <= BigInt(0)) {
    throw new Error(
      "TREASURY_INTERCOMPANY_TRANSFER_INVALID_AMOUNT: transfer amount must be positive"
    );
  }

  return {
    debitLegAmountMinor: transferAmountMinor,
    creditLegAmountMinor: transferAmountMinor,
  };
}

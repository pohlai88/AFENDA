/**
 * threeWayMatch — pure calculator for PO → Receipt → Invoice matching.
 *
 * Algorithm (ap-module-reference §Calculators):
 * 1. PO vs Receipt → If mismatch, return QUANTITY_MISMATCH
 * 2. Receipt vs Invoice → If exact match, return MATCHED
 * 3. Tolerance check → variance % vs tolerance, return WITHIN_TOLERANCE or OVER_TOLERANCE
 *
 * Variance: (invoice - receipt) in minor units; % = abs(variance) * 10000 / receipt (basis points)
 */

export type MatchResult =
  | { readonly status: "MATCHED" }
  | {
      readonly status: "QUANTITY_MISMATCH";
      readonly poAmount: bigint;
      readonly receiptAmount: bigint;
    }
  | {
      readonly status: "PRICE_MISMATCH";
      readonly receiptAmount: bigint;
      readonly invoiceAmount: bigint;
    }
  | {
      readonly status: "WITHIN_TOLERANCE";
      readonly variance: bigint;
      readonly variancePercent: number;
    }
  | {
      readonly status: "OVER_TOLERANCE";
      readonly variance: bigint;
      readonly variancePercent: number;
    };

export interface MatchInput {
  readonly poAmount: bigint;
  readonly receiptAmount: bigint;
  readonly invoiceAmount: bigint;
  readonly tolerancePercent: number;
}

/**
 * Pure 3-way match. No I/O, deterministic.
 */
export function threeWayMatch(input: MatchInput): MatchResult {
  const { poAmount, receiptAmount, invoiceAmount, tolerancePercent } = input;

  // Step 1: PO vs Receipt → quantity mismatch
  if (poAmount !== receiptAmount) {
    return {
      status: "QUANTITY_MISMATCH",
      poAmount,
      receiptAmount,
    };
  }

  // Step 2: Receipt vs Invoice → exact match
  if (receiptAmount === invoiceAmount) {
    return { status: "MATCHED" };
  }

  // Step 3: Tolerance check (receipt vs invoice price variance)
  const variance = invoiceAmount - receiptAmount;
  const absVariance = variance < 0n ? -variance : variance;

  if (receiptAmount === 0n) {
    return {
      status: "OVER_TOLERANCE",
      variance,
      variancePercent: 100,
    };
  }

  const varianceBps = Number((absVariance * 10000n) / receiptAmount);
  const variancePercent = varianceBps / 100;
  const toleranceBps = tolerancePercent * 100;

  if (varianceBps <= toleranceBps) {
    return {
      status: "WITHIN_TOLERANCE",
      variance,
      variancePercent,
    };
  }

  return {
    status: "OVER_TOLERANCE",
    variance,
    variancePercent,
  };
}

import type { internalInterestDayCountValues } from "@afenda/contracts";

export type InternalInterestDayCount = (typeof internalInterestDayCountValues)[number];

export function dayCountFactor(params: {
  dayCountConvention: InternalInterestDayCount;
  days: number;
}): number {
  if (params.dayCountConvention === "actual_360") return params.days / 360;
  if (params.dayCountConvention === "actual_365") return params.days / 365;
  return params.days / 360;
}

export function calculateInternalInterestMinor(params: {
  principalMinor: string;
  annualRateBps: number;
  dayCountConvention: InternalInterestDayCount;
  days: number;
}): string {
  const principal = BigInt(params.principalMinor);
  const annualRateBps = BigInt(params.annualRateBps);
  const dayCountDenominator = params.dayCountConvention === "actual_365" ? 365n : 360n;

  return (
    (principal * annualRateBps * BigInt(params.days)) /
    10000n /
    dayCountDenominator
  ).toString();
}

export function buildNetPositions(
  items: Array<{
    fromLegalEntityId: string;
    toLegalEntityId: string;
    amountMinor: string;
  }>,
) {
  const positions = new Map<string, bigint>();

  for (const item of items) {
    const amount = BigInt(item.amountMinor);
    positions.set(item.fromLegalEntityId, (positions.get(item.fromLegalEntityId) ?? 0n) - amount);
    positions.set(item.toLegalEntityId, (positions.get(item.toLegalEntityId) ?? 0n) + amount);
  }

  return [...positions.entries()].map(([legalEntityId, netPosition]) => ({
    legalEntityId,
    netPositionMinor: netPosition.toString(),
  }));
}

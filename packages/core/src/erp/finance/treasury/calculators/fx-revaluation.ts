export function calculateRevaluationDeltaMinor(params: {
  carryingAmountMinor: string;
  revaluedAmountMinor: string;
}): string {
  return (BigInt(params.revaluedAmountMinor) - BigInt(params.carryingAmountMinor)).toString();
}

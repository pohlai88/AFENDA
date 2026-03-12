export function normalizeMinorByScaledRate(params: {
  amountMinor: string;
  rateScaled: string;
  scale: number;
}): string {
  const amount = BigInt(params.amountMinor);
  const rateScaled = BigInt(params.rateScaled);
  const divisor = BigInt(10 ** params.scale);

  return ((amount * rateScaled) / divisor).toString();
}

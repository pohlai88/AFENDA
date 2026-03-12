export function normalizeMinorByScaledRate(params: {
  amountMinor: string;
  rateScaled: string;
  scale: number;
}): string {
  const amount = BigInt(params.amountMinor);
  const rateScaled = BigInt(params.rateScaled);
  const divisor = BigInt(10) ** BigInt(params.scale);

  return ((amount * rateScaled) / divisor).toString();
}

export function invertScaledRate(params: {
  rateScaled: string;
  scale: number;
}): string {
  const numerator = BigInt(10) ** BigInt(params.scale * 2);
  return (numerator / BigInt(params.rateScaled)).toString();
}

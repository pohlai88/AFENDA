export function evaluateLimitBreach(params: {
  measuredValueMinor: string;
  thresholdMinor: string;
}) {
  const measured = BigInt(params.measuredValueMinor);
  const threshold = BigInt(params.thresholdMinor);

  if (measured <= threshold) {
    return { breached: false, exceededByMinor: "0" };
  }

  return {
    breached: true,
    exceededByMinor: (measured - threshold).toString(),
  };
}

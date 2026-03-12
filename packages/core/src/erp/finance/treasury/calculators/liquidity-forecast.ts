export type LiquidityForecastInput = {
  openingLiquidityMinor: string;
  buckets: Array<{
    expectedInflowsMinor: string;
    expectedOutflowsMinor: string;
  }>;
};

export function buildLiquidityForecastBuckets(input: LiquidityForecastInput) {
  const results: Array<{
    bucketIndex: number;
    expectedInflowsMinor: string;
    expectedOutflowsMinor: string;
    openingBalanceMinor: string;
    closingBalanceMinor: string;
  }> = [];

  let running = BigInt(input.openingLiquidityMinor);

  input.buckets.forEach((bucket, index) => {
    const opening = running;
    const closing =
      running + BigInt(bucket.expectedInflowsMinor) - BigInt(bucket.expectedOutflowsMinor);

    results.push({
      bucketIndex: index,
      expectedInflowsMinor: bucket.expectedInflowsMinor,
      expectedOutflowsMinor: bucket.expectedOutflowsMinor,
      openingBalanceMinor: opening.toString(),
      closingBalanceMinor: closing.toString(),
    });

    running = closing;
  });

  return {
    openingLiquidityMinor: input.openingLiquidityMinor,
    closingLiquidityMinor: running.toString(),
    totalExpectedInflowsMinor: input.buckets
      .reduce((acc, x) => acc + BigInt(x.expectedInflowsMinor), 0n)
      .toString(),
    totalExpectedOutflowsMinor: input.buckets
      .reduce((acc, x) => acc + BigInt(x.expectedOutflowsMinor), 0n)
      .toString(),
    buckets: results,
  };
}

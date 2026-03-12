/**
 * Liquidity bucket allocation calculator — Wave 3.5
 *
 * Pure function: accepts a list of normalised liquidity feed entries
 * (AP due payments as outflows, AR expected receipts as inflows) and
 * allocates them into daily date-keyed buckets within a date window.
 *
 * No DB access — fully testable in isolation.
 */

export type LiquidityFeedEntry = {
  effectiveDate: string;        // "YYYY-MM-DD"
  amountMinor: string;          // bigint-string minor units (cents)
  direction: "inflow" | "outflow";
};

export type LiquidityDailyBucket = {
  bucketIndex: number;
  date: string;                 // "YYYY-MM-DD"
  expectedInflowsMinor: string;
  expectedOutflowsMinor: string;
  netMinor: string;             // inflows − outflows
};

export type AllocateFeedToDailyBucketsResult = {
  startDate: string;
  endDate: string;
  buckets: LiquidityDailyBucket[];
  totalInflowsMinor: string;
  totalOutflowsMinor: string;
  totalNetMinor: string;
};

/**
 * Allocates a list of liquidity feed entries into daily buckets.
 *
 * - Buckets are created for every calendar day in [startDate, endDate] inclusive.
 * - Feed entries with effectiveDate outside the window are ignored.
 * - All amounts are bigint minor units (integer strings — no floats).
 *
 * @param startDate  ISO date "YYYY-MM-DD" (inclusive)
 * @param endDate    ISO date "YYYY-MM-DD" (inclusive)
 * @param feeds      Normalised liquidity feed rows
 */
export function allocateFeedToDailyBuckets(params: {
  startDate: string;
  endDate: string;
  feeds: LiquidityFeedEntry[];
}): AllocateFeedToDailyBucketsResult {
  const { startDate, endDate, feeds } = params;

  // Build ordered map of date → bucket accumulators
  const map = new Map<string, { inflowMinor: bigint; outflowMinor: bigint }>();

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (start > end) {
    throw new RangeError(
      `allocateFeedToDailyBuckets: startDate (${startDate}) must be ≤ endDate (${endDate})`,
    );
  }

  for (
    let d = new Date(start);
    d <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, { inflowMinor: 0n, outflowMinor: 0n });
  }

  // Accumulate feeds into their respective daily buckets
  for (const feed of feeds) {
    const bucket = map.get(feed.effectiveDate);
    if (!bucket) continue; // outside window — skip

    const amount = BigInt(feed.amountMinor);
    if (feed.direction === "inflow") {
      bucket.inflowMinor += amount;
    } else {
      bucket.outflowMinor += amount;
    }
  }

  let totalInflows = 0n;
  let totalOutflows = 0n;

  const buckets: LiquidityDailyBucket[] = [...map.entries()].map(
    ([date, value], index) => {
      totalInflows += value.inflowMinor;
      totalOutflows += value.outflowMinor;
      return {
        bucketIndex: index,
        date,
        expectedInflowsMinor: value.inflowMinor.toString(),
        expectedOutflowsMinor: value.outflowMinor.toString(),
        netMinor: (value.inflowMinor - value.outflowMinor).toString(),
      };
    },
  );

  return {
    startDate,
    endDate,
    buckets,
    totalInflowsMinor: totalInflows.toString(),
    totalOutflowsMinor: totalOutflows.toString(),
    totalNetMinor: (totalInflows - totalOutflows).toString(),
  };
}

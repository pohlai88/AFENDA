import type { Metadata } from "next";
import { LiquidityForecastReport } from "../components/liquidity-forecast-report";

export const metadata: Metadata = {
  title: "Liquidity Forecast — Treasury — AFENDA",
  description: "Create scenarios and calculate liquidity forecasts for treasury planning",
};

export default function TreasuryLiquidityForecastPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liquidity Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Model scenarios and calculate forward liquidity buckets from validated cash snapshots.
        </p>
      </div>
      <LiquidityForecastReport />
    </div>
  );
}

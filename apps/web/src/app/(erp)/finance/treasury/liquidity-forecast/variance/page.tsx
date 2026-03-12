import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@afenda/ui";
import {
  fetchTreasuryLiquidityForecasts,
  fetchTreasuryForecastVarianceByForecast,
} from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Forecast Variance — Treasury — AFENDA",
  description: "Backtest liquidity forecasts against measured actuals",
};

export default async function LiquidityForecastVariancePage() {
  const forecasts = await fetchTreasuryLiquidityForecasts({ limit: 25 }).catch(() => ({
    data: [],
    cursor: null,
    hasMore: false,
  }));

  const topForecasts = forecasts.data.slice(0, 10);

  const varianceByForecast = await Promise.all(
    topForecasts.map(async (f) => ({
      forecast: f,
      variance: await fetchTreasuryForecastVarianceByForecast(f.id).catch(() => ({ data: [] })),
    })),
  );

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forecast Variance</h1>
        <p className="text-sm text-muted-foreground">
          Compare expected liquidity bucket movements against actual outcomes.
        </p>
      </div>

      {varianceByForecast.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No liquidity forecasts available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {varianceByForecast.map(({ forecast, variance }) => (
            <Card key={forecast.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {forecast.forecastDate} · {forecast.baseCurrencyCode}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline">{forecast.status}</Badge>
                  <span className="font-mono text-xs">{forecast.id}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variance.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No variance records for this forecast.</p>
                ) : (
                  <div className="space-y-2">
                    {variance.data.map((row) => (
                      <div key={row.id} className="rounded-md border p-3 text-sm">
                        <div className="mb-1 font-mono text-xs text-muted-foreground">Bucket {row.bucketId}</div>
                        <div className="grid gap-1 sm:grid-cols-3">
                          <div>Inflow variance: {row.inflowVarianceMinor}</div>
                          <div>Outflow variance: {row.outflowVarianceMinor}</div>
                          <div>Closing variance: {row.closingBalanceVarianceMinor}</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Measured at {new Date(row.measuredAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

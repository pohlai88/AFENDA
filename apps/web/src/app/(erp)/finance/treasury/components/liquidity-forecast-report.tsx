"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import {
  activateTreasuryLiquidityScenario,
  createTreasuryLiquidityScenario,
  fetchTreasuryCashPositionSnapshots,
  fetchTreasuryLiquidityForecastBuckets,
  fetchTreasuryLiquidityForecastLineage,
  fetchTreasuryLiquidityForecasts,
  fetchTreasuryLiquidityScenarios,
  requestTreasuryLiquidityForecast,
  type TreasuryCashPositionSnapshotRow,
  type TreasuryLiquidityForecastBucketRow,
  type TreasuryLiquidityForecastBucketLineageRow,
  type TreasuryLiquidityForecastRow,
  type TreasuryLiquidityScenarioRow,
} from "@/lib/api-client";

const SCENARIO_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  active: "default",
  inactive: "outline",
};

const FORECAST_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  calculated: "default",
  superseded: "outline",
};

export function LiquidityForecastReport() {
  const [loading, setLoading] = useState(true);
  const [savingScenario, setSavingScenario] = useState(false);
  const [savingForecast, setSavingForecast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<TreasuryLiquidityScenarioRow[]>([]);
  const [snapshots, setSnapshots] = useState<TreasuryCashPositionSnapshotRow[]>([]);
  const [forecasts, setForecasts] = useState<TreasuryLiquidityForecastRow[]>([]);
  const [buckets, setBuckets] = useState<TreasuryLiquidityForecastBucketRow[]>([]);
  const [lineageRows, setLineageRows] = useState<TreasuryLiquidityForecastBucketLineageRow[]>([]);
  const [selectedForecastId, setSelectedForecastId] = useState<string>("");
  const [loadingLineage, setLoadingLineage] = useState(false);

  const [scenarioCode, setScenarioCode] = useState("BASE-001");
  const [scenarioName, setScenarioName] = useState("Base Case");
  const [scenarioType, setScenarioType] = useState<"base_case" | "optimistic" | "stress" | "custom">("base_case");
  const [horizonDays, setHorizonDays] = useState("30");
  const [assumptionSetVersion, setAssumptionSetVersion] = useState("wave3-sprint3.2");
  const [assumedDailyInflowsMinor, setAssumedDailyInflowsMinor] = useState("100000");
  const [assumedDailyOutflowsMinor, setAssumedDailyOutflowsMinor] = useState("80000");

  const [liquidityScenarioId, setLiquidityScenarioId] = useState("");
  const [cashPositionSnapshotId, setCashPositionSnapshotId] = useState("");
  const [forecastDate, setForecastDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [bucketGranularity, setBucketGranularity] = useState<"daily" | "weekly">("daily");
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("USD");
  const [sourceVersion, setSourceVersion] = useState("wave3-sprint3.2");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sc, cp, lf] = await Promise.all([
        fetchTreasuryLiquidityScenarios(),
        fetchTreasuryCashPositionSnapshots({ limit: 50, status: "calculated" }),
        fetchTreasuryLiquidityForecasts({ limit: 50 }),
      ]);

      setScenarios(sc.data ?? []);
      setSnapshots(cp.data ?? []);
      setForecasts(lf.data ?? []);

      const defaultScenarioId = (sc.data ?? []).find((s) => s.status === "active")?.id ?? sc.data?.[0]?.id ?? "";
      const defaultSnapshotId = cp.data?.[0]?.id ?? "";
      setLiquidityScenarioId((prev) => prev || defaultScenarioId);
      setCashPositionSnapshotId((prev) => prev || defaultSnapshotId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load liquidity data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedScenarioName = useMemo(
    () => scenarios.find((s) => s.id === liquidityScenarioId)?.name ?? "",
    [scenarios, liquidityScenarioId],
  );

  async function onCreateScenario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingScenario(true);
    setError(null);
    try {
      await createTreasuryLiquidityScenario({
        code: scenarioCode,
        name: scenarioName,
        scenarioType,
        horizonDays: Number(horizonDays),
        assumptionSetVersion,
        assumptionsJson: {
          assumedDailyInflowsMinor,
          assumedDailyOutflowsMinor,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create liquidity scenario");
    } finally {
      setSavingScenario(false);
    }
  }

  async function onActivateScenario(id: string) {
    setError(null);
    try {
      await activateTreasuryLiquidityScenario(id);
      await load();
      setLiquidityScenarioId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate liquidity scenario");
    }
  }

  async function onRequestForecast(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingForecast(true);
    setError(null);
    try {
      await requestTreasuryLiquidityForecast({
        liquidityScenarioId,
        cashPositionSnapshotId,
        forecastDate,
        startDate,
        endDate,
        bucketGranularity,
        baseCurrencyCode,
        sourceVersion,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request liquidity forecast");
    } finally {
      setSavingForecast(false);
    }
  }

  async function onViewBuckets(forecastId: string) {
    setSelectedForecastId(forecastId);
    setError(null);
    setLoadingLineage(true);
    try {
      const [bucketResult, lineageResult] = await Promise.all([
        fetchTreasuryLiquidityForecastBuckets(forecastId),
        fetchTreasuryLiquidityForecastLineage(forecastId),
      ]);
      setBuckets(bucketResult.data ?? []);
      setLineageRows(lineageResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load liquidity forecast buckets");
      setBuckets([]);
      setLineageRows([]);
    } finally {
      setLoadingLineage(false);
    }
  }

  const lineageCountByBucket = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of lineageRows) {
      counts.set(row.bucketId, (counts.get(row.bucketId) ?? 0) + 1);
    }
    return counts;
  }, [lineageRows]);

  const uniqueLineageFeedCount = useMemo(() => {
    return new Set(lineageRows.map((row) => row.liquiditySourceFeedId)).size;
  }, [lineageRows]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/treasury/liquidity-forecast/variance">View Variance</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onCreateScenario(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="scenarioCode">Code</Label>
              <Input id="scenarioCode" value={scenarioCode} onChange={(e) => setScenarioCode(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scenarioName">Name</Label>
              <Input id="scenarioName" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scenarioType">Type</Label>
              <Input
                id="scenarioType"
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value as "base_case" | "optimistic" | "stress" | "custom")}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horizonDays">Horizon Days</Label>
              <Input id="horizonDays" type="number" min={1} value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assumptionSetVersion">Assumption Version</Label>
              <Input
                id="assumptionSetVersion"
                value={assumptionSetVersion}
                onChange={(e) => setAssumptionSetVersion(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assumedDailyInflowsMinor">Assumed Daily Inflows (minor)</Label>
              <Input
                id="assumedDailyInflowsMinor"
                value={assumedDailyInflowsMinor}
                onChange={(e) => setAssumedDailyInflowsMinor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assumedDailyOutflowsMinor">Assumed Daily Outflows (minor)</Label>
              <Input
                id="assumedDailyOutflowsMinor"
                value={assumedDailyOutflowsMinor}
                onChange={(e) => setAssumedDailyOutflowsMinor(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={savingScenario}>
                {savingScenario ? "Creating..." : "Create Scenario"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onRequestForecast(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="liquidityScenarioId">Scenario ID</Label>
              <Input
                id="liquidityScenarioId"
                value={liquidityScenarioId}
                onChange={(e) => setLiquidityScenarioId(e.target.value)}
                placeholder="Select from table below"
                required
              />
              {selectedScenarioName ? (
                <p className="text-xs text-muted-foreground">Selected: {selectedScenarioName}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cashPositionSnapshotId">Cash Snapshot ID</Label>
              <Input
                id="cashPositionSnapshotId"
                value={cashPositionSnapshotId}
                onChange={(e) => setCashPositionSnapshotId(e.target.value)}
                placeholder="Calculated snapshot ID"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="forecastDate">Forecast Date</Label>
              <Input id="forecastDate" type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bucketGranularity">Bucket Granularity</Label>
              <Input
                id="bucketGranularity"
                value={bucketGranularity}
                onChange={(e) => setBucketGranularity(e.target.value as "daily" | "weekly")}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="baseCurrencyCode">Base Currency</Label>
              <Input
                id="baseCurrencyCode"
                value={baseCurrencyCode}
                onChange={(e) => setBaseCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sourceVersion">Source Version</Label>
              <Input id="sourceVersion" value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={savingForecast}>
                {savingForecast ? "Requesting..." : "Request Forecast"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liquidity Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Loading scenarios...</p>
          ) : scenarios.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No scenarios yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.scenarioType}</TableCell>
                    <TableCell>
                      <Badge variant={SCENARIO_STATUS_VARIANTS[row.status] ?? "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void onActivateScenario(row.id)}
                        disabled={row.status === "active"}
                      >
                        Activate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liquidity Forecasts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Loading forecasts...</p>
          ) : forecasts.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No forecasts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forecast Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead>Snapshot ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.forecastDate}</TableCell>
                    <TableCell>
                      <Badge variant={FORECAST_STATUS_VARIANTS[row.status] ?? "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.openingLiquidityMinor}</TableCell>
                    <TableCell>{row.closingLiquidityMinor}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs">{row.cashPositionSnapshotId}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant={selectedForecastId === row.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => void onViewBuckets(row.id)}
                        >
                          Buckets
                        </Button>
                        <Button asChild type="button" variant="outline" size="sm">
                          <Link href={`/finance/treasury/liquidity-forecast/${row.id}/lineage`}>
                            Lineage
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forecast Buckets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {selectedForecastId === "" ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Select a forecast to view buckets.</p>
          ) : loadingLineage ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Loading buckets and lineage...</p>
          ) : buckets.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No buckets available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Inflows</TableHead>
                  <TableHead>Outflows</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead className="text-right">Lineage Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.bucketIndex}</TableCell>
                    <TableCell>{row.bucketStartDate}</TableCell>
                    <TableCell>{row.bucketEndDate}</TableCell>
                    <TableCell>{row.expectedInflowsMinor}</TableCell>
                    <TableCell>{row.expectedOutflowsMinor}</TableCell>
                    <TableCell>{row.openingBalanceMinor}</TableCell>
                    <TableCell>{row.closingBalanceMinor}</TableCell>
                    <TableCell className="text-right">{lineageCountByBucket.get(row.id) ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forecast Lineage</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedForecastId === "" ? (
            <p className="text-sm text-muted-foreground">Select a forecast to inspect source lineage.</p>
          ) : loadingLineage ? (
            <p className="text-sm text-muted-foreground">Loading forecast lineage...</p>
          ) : lineageRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lineage rows found for this forecast.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Lineage Rows</p>
                  <p className="text-lg font-semibold">{lineageRows.length}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Unique Source Feeds</p>
                  <p className="text-lg font-semibold">{uniqueLineageFeedCount}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Buckets With Lineage</p>
                  <p className="text-lg font-semibold">{lineageCountByBucket.size}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket ID</TableHead>
                    <TableHead>Liquidity Source Feed ID</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineageRows.slice(0, 8).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[260px] truncate font-mono text-xs">{row.bucketId}</TableCell>
                      <TableCell className="max-w-[260px] truncate font-mono text-xs">{row.liquiditySourceFeedId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {snapshots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calculated Cash Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs text-muted-foreground">
              {snapshots.slice(0, 5).map((snapshot) => (
                <p key={snapshot.id} className="font-mono">
                  {snapshot.id}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

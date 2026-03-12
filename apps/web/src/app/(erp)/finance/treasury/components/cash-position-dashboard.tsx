"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
  Badge,
} from "@afenda/ui";
import {
  fetchTreasuryCashPositionSnapshotLineage,
  fetchTreasuryCashPositionSnapshots,
  requestTreasuryCashPositionSnapshot,
  type TreasuryCashPositionSnapshotLineageRow,
  type TreasuryCashPositionSnapshotRow,
} from "@/lib/api-client";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  calculated: "default",
  superseded: "outline",
};

export function CashPositionDashboard() {
  const [rows, setRows] = useState<TreasuryCashPositionSnapshotRow[]>([]);
  const [lineageRows, setLineageRows] = useState<TreasuryCashPositionSnapshotLineageRow[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingLineage, setLoadingLineage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10));
  const [asOfAt, setAsOfAt] = useState(new Date().toISOString().slice(0, 19) + "Z");
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("USD");
  const [sourceVersion, setSourceVersion] = useState("wave3-sprint3.1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTreasuryCashPositionSnapshots({ limit: 50 });
      setRows(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cash position snapshots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRequestSnapshot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await requestTreasuryCashPositionSnapshot({
        snapshotDate,
        asOfAt,
        baseCurrencyCode,
        sourceVersion,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request snapshot");
    } finally {
      setSaving(false);
    }
  }

  async function onViewLineage(snapshotId: string) {
    setSelectedSnapshotId(snapshotId);
    setLoadingLineage(true);
    setError(null);
    try {
      const result = await fetchTreasuryCashPositionSnapshotLineage(snapshotId);
      setLineageRows(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load snapshot lineage");
      setLineageRows([]);
    } finally {
      setLoadingLineage(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onRequestSnapshot(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="snapshotDate">Snapshot Date</Label>
              <Input
                id="snapshotDate"
                type="date"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="asOfAt">As Of (UTC)</Label>
              <Input
                id="asOfAt"
                value={asOfAt}
                onChange={(e) => setAsOfAt(e.target.value)}
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
              <Input
                id="sourceVersion"
                value={sourceVersion}
                onChange={(e) => setSourceVersion(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Requesting…" : "Request Snapshot"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshots</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Loading snapshots…</p>
          ) : rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Snapshot Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base Currency</TableHead>
                  <TableHead>Projected Available</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.snapshotDate}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.baseCurrencyCode}</TableCell>
                    <TableCell>{row.totalProjectedAvailableMinor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant={selectedSnapshotId === row.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => void onViewLineage(row.id)}
                        >
                          Inline
                        </Button>
                        <Button asChild type="button" variant="outline" size="sm">
                          <Link href={`/finance/treasury/cash-position/${row.id}/lineage`}>Lineage</Link>
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
          <CardTitle className="text-base">Snapshot Lineage</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {selectedSnapshotId === "" ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Select a snapshot to view lineage.</p>
          ) : loadingLineage ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Loading lineage...</p>
          ) : lineageRows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No lineage rows found for this snapshot.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Snapshot Line ID</TableHead>
                  <TableHead>Liquidity Source Feed ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[240px] truncate font-mono text-xs">{row.snapshotLineId}</TableCell>
                    <TableCell className="max-w-[240px] truncate font-mono text-xs">{row.liquiditySourceFeedId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

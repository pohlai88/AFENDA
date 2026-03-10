"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AnalyticsWorkspace,
  Button,
  Skeleton,
} from "@afenda/ui";
import { fetchAgingReport } from "@/lib/api-client";

function formatMoney(minor: string): string {
  const n = Number(minor) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

const BUCKET_LABELS: Record<string, { label: string; days: string }> = {
  current: { label: "Current", days: "0–30 days" },
  "1-30": { label: "1–30 days", days: "1–30 days overdue" },
  "31-60": { label: "31–60 days", days: "31–60 days overdue" },
  "61-90": { label: "61–90 days", days: "61–90 days overdue" },
  "90+": { label: "90+ days", days: "90+ days overdue" },
};

export default function AgingClient() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAgingReport>>["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgingReport()
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load aging report"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary;
  const byBucket = summary?.byBucket ?? [];

  const bucketMap = new Map(byBucket.map((b) => [b.bucket, b]));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnalyticsWorkspace>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(["current", "1-30", "31-60", "61-90", "90+"] as const).map((bucket) => {
            const info = BUCKET_LABELS[bucket] ?? { label: bucket, days: "" };
            const bucketData = bucketMap.get(bucket);
            const amount = bucketData?.totalAmountMinor ?? "0";
            const count = bucketData?.invoiceCount ?? 0;

            return (
              <Card key={bucket}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {info.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoney(amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} invoice{count !== 1 ? "s" : ""}
                    {info.days ? ` · ${info.days}` : ""}
                  </p>
                  {count > 0 && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-1" asChild>
                      <Link href={`/finance/ap/aging/${bucket}/invoices`}>
                        View invoices →
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aging Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              As of {data?.asOfDate ?? "—"}. Total outstanding:{" "}
              {summary ? formatMoney(summary.totalOutstandingMinor) : "—"} (
              {summary?.totalInvoiceCount ?? 0} invoices)
            </p>
          </CardHeader>
          <CardContent>
            {data?.suppliers && data.suppliers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">By supplier</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {data.suppliers.slice(0, 10).map((s) => (
                    <li key={s.supplierId}>
                      {s.supplierName}: {formatMoney(s.totalOutstandingMinor)} ({s.invoiceCount}{" "}
                      invoices)
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No outstanding invoices in approved/posted status.
              </p>
            )}
          </CardContent>
        </Card>
      </AnalyticsWorkspace>
    </div>
  );
}

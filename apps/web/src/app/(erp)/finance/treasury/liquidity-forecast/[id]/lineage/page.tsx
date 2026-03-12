import Link from "next/link";
import type { Metadata } from "next";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { listTreasuryLiquidityForecastLineageAction } from "../../../actions";
import { LineageTable } from "../../../components/lineage-table";

export const metadata: Metadata = {
  title: "Forecast Lineage - Treasury - AFENDA",
  description: "Inspect source lineage rows for a liquidity forecast",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TreasuryLiquidityForecastLineagePage({ params }: PageProps) {
  const { id } = await params;
  const lineage = await listTreasuryLiquidityForecastLineageAction(id);

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Liquidity Forecast Lineage</h1>
          <p className="text-sm text-muted-foreground">
            Forecast ID: <span className="font-mono">{id}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/treasury/liquidity-forecast">Back to Liquidity Forecast</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lineage Rows</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LineageTable rows={lineage.data ?? []} mode="forecast" />
        </CardContent>
      </Card>
    </div>
  );
}

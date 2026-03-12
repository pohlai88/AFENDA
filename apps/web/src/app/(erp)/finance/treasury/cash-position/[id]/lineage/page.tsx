import Link from "next/link";
import type { Metadata } from "next";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { listTreasuryCashPositionSnapshotLineageAction } from "../../../actions";
import { LineageTable } from "../../../components/lineage-table";

export const metadata: Metadata = {
  title: "Snapshot Lineage - Treasury - AFENDA",
  description: "Inspect source lineage rows for a cash position snapshot",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TreasuryCashPositionLineagePage({ params }: PageProps) {
  const { id } = await params;
  const lineage = await listTreasuryCashPositionSnapshotLineageAction(id);

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Snapshot Lineage</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot ID: <span className="font-mono">{id}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/treasury/cash-position">Back to Cash Position</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lineage Rows</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LineageTable rows={lineage.data ?? []} mode="snapshot" />
        </CardContent>
      </Card>
    </div>
  );
}

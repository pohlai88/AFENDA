import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";

type SnapshotLineageRow = {
  id: string;
  liquiditySourceFeedId: string;
  createdAt: string;
  snapshotLineId: string;
};

type ForecastLineageRow = {
  id: string;
  liquiditySourceFeedId: string;
  createdAt: string;
  bucketId: string;
};

type LineageTableProps = {
  rows: Array<SnapshotLineageRow | ForecastLineageRow>;
  mode: "snapshot" | "forecast";
};

export function LineageTable({ rows, mode }: LineageTableProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted-foreground">No lineage rows found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{mode === "snapshot" ? "Snapshot Line ID" : "Bucket ID"}</TableHead>
          <TableHead>Liquidity Source Feed ID</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-[260px] truncate font-mono text-xs">
              {"snapshotLineId" in row ? row.snapshotLineId : row.bucketId}
            </TableCell>
            <TableCell className="max-w-[260px] truncate font-mono text-xs">{row.liquiditySourceFeedId}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(row.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

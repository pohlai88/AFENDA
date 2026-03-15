import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import { fetchReviewCycles } from "../../shared/hrm-client";

interface ReviewCycleItem {
  reviewCycleId: string;
  cycleCode: string;
  cycleName: string;
  startDate: string;
  endDate: string;
  status: string;
}

function toReviewCycleItems(data: unknown): ReviewCycleItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as ReviewCycleItem[]) : [];
}

export default async function ReviewCyclesPage() {
  const res = await fetchReviewCycles({ limit: 50 });
  const items = toReviewCycleItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Review Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Performance review cycles for the organization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/performance/manager-queue">Manager Review Queue</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycles</CardTitle>
          <CardDescription>
            Showing {items.length} review cycle{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No review cycles found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.reviewCycleId}>
                    <TableCell className="font-mono text-sm">{item.cycleCode}</TableCell>
                    <TableCell>{item.cycleName}</TableCell>
                    <TableCell>
                      {item.startDate} to {item.endDate}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
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

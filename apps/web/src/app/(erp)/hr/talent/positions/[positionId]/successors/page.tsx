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
import { fetchSuccessorsForPosition } from "../../../../shared/hrm-client";

interface SuccessorItem {
  successorNominationId: string;
  successionPlanId: string;
  employmentId: string;
  employmentNumber: string;
  readinessLevel: string;
  createdAt: string;
}

function toSuccessorItems(data: unknown): SuccessorItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as SuccessorItem[]) : [];
}

export default async function SuccessorsPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  const res = await fetchSuccessorsForPosition(positionId, { limit: 50 });
  const items = toSuccessorItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Successors for Position</h1>
          <p className="font-mono text-sm text-muted-foreground">{positionId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/talent/succession-plans">Succession Plans</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Successor Slate</CardTitle>
          <CardDescription>
            Showing {items.length} successor nomination{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No successors nominated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employment #</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Nominated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.successorNominationId}>
                    <TableCell className="font-mono">{item.employmentNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.readinessLevel}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdAt.slice(0, 10)}
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

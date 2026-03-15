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
import { fetchSuccessionPlans } from "../../shared/hrm-client";

interface SuccessionPlanItem {
  successionPlanId: string;
  positionId: string;
  positionTitle: string | null;
  criticalRoleFlag: boolean;
  status: string;
  createdAt: string;
}

function toSuccessionPlanItems(data: unknown): SuccessionPlanItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as SuccessionPlanItem[]) : [];
}

export default async function SuccessionPlansPage() {
  const res = await fetchSuccessionPlans({ limit: 50 });
  const items = toSuccessionPlanItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Succession Plans</h1>
          <p className="text-sm text-muted-foreground">
            Position succession plans and successor slates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/organization/positions">View Positions</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>
            Showing {items.length} succession plan{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No succession plans found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Critical Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.successionPlanId}>
                    <TableCell>
                      {item.positionTitle ?? (
                        <span className="font-mono text-xs">{item.positionId}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.criticalRoleFlag ? (
                        <Badge variant="destructive">Critical</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/hr/talent/positions/${item.positionId}/successors`}>
                          View Successors
                        </Link>
                      </Button>
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

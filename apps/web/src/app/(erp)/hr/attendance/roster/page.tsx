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
import { fetchRosterAssignments } from "../../shared/hrm-client";

interface RosterAssignmentItem {
  rosterAssignmentId: string;
  employmentId: string;
  shiftId: string;
  workDate: string;
  status: string;
}

function toRosterItems(data: unknown): RosterAssignmentItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as RosterAssignmentItem[]) : [];
}

export default async function RosterAssignmentsPage() {
  const res = await fetchRosterAssignments({ limit: 25 });
  const items = toRosterItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Roster Assignments</h1>
          <p className="text-sm text-muted-foreground">Scheduled shift assignments by work date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/attendance/records">Attendance Records</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Roster</CardTitle>
          <CardDescription>
            Showing {items.length} assignment{items.length === 1 ? "" : "s"} from roster planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roster assignments found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Date</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.rosterAssignmentId}>
                    <TableCell>{item.workDate}</TableCell>
                    <TableCell className="font-mono text-xs">{item.employmentId}</TableCell>
                    <TableCell className="font-mono text-xs">{item.shiftId}</TableCell>
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

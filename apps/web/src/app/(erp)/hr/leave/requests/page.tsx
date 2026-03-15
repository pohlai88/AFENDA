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
import { fetchLeaveRequests } from "../../shared/hrm-client";

interface LeaveRequestItem {
  leaveRequestId: string;
  employmentId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedAmount: string;
  status: string;
}

function toLeaveRequestItems(data: unknown): LeaveRequestItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as LeaveRequestItem[]) : [];
}

export default async function LeaveRequestsPage() {
  const res = await fetchLeaveRequests({ limit: 25 });
  const items = toLeaveRequestItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">My Leave Requests</h1>
          <p className="text-sm text-muted-foreground">
            Submitted leave requests across leave types.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/leave/approvals">Leave Approvals</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/leave/balances">Leave Balances</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            Showing {items.length} leave request{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.leaveRequestId}>
                    <TableCell>
                      {item.startDate} to {item.endDate}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.employmentId}</TableCell>
                    <TableCell className="font-mono text-xs">{item.leaveTypeId}</TableCell>
                    <TableCell>{item.requestedAmount}</TableCell>
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

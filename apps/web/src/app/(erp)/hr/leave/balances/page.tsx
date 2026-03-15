import Link from "next/link";
import {
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
import { fetchLeaveBalances } from "../../shared/hrm-client";

interface LeaveBalanceItem {
  leaveBalanceId: string;
  employmentId: string;
  leaveTypeId: string;
  accrualPeriod: string;
  openingBalance: string;
  accruedAmount: string;
  consumedAmount: string;
  closingBalance: string;
}

function toLeaveBalanceItems(data: unknown): LeaveBalanceItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as LeaveBalanceItem[]) : [];
}

export default async function LeaveBalancesPage() {
  const res = await fetchLeaveBalances({ limit: 25 });
  const items = toLeaveBalanceItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Leave Balances</h1>
          <p className="text-sm text-muted-foreground">
            Accrual ledger showing opening, accrued, consumed, and closing balances.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/leave/requests">My Leave Requests</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/leave/approvals">Leave Approvals</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance Ledger</CardTitle>
          <CardDescription>
            Showing {items.length} leave balance row{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave balances found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Accrued</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.leaveBalanceId}>
                    <TableCell>{item.accrualPeriod}</TableCell>
                    <TableCell className="font-mono text-xs">{item.employmentId}</TableCell>
                    <TableCell className="font-mono text-xs">{item.leaveTypeId}</TableCell>
                    <TableCell>{item.openingBalance}</TableCell>
                    <TableCell>{item.accruedAmount}</TableCell>
                    <TableCell>{item.consumedAmount}</TableCell>
                    <TableCell>{item.closingBalance}</TableCell>
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

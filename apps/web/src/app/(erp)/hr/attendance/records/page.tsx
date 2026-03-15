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
import { fetchAttendanceRecords } from "../../shared/hrm-client";

interface AttendanceRecordItem {
  attendanceRecordId: string;
  employmentId: string;
  workDate: string;
  attendanceStatus: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  source: string | null;
}

function toAttendanceItems(data: unknown): AttendanceRecordItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as AttendanceRecordItem[]) : [];
}

export default async function AttendanceRecordsPage() {
  const res = await fetchAttendanceRecords({ limit: 25 });
  const items = toAttendanceItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Attendance Records</h1>
          <p className="text-sm text-muted-foreground">
            Daily attendance log with check-in/check-out snapshots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/attendance/roster">Roster Assignments</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Attendance</CardTitle>
          <CardDescription>
            Showing {items.length} record{items.length === 1 ? "" : "s"} from the attendance ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Date</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.attendanceRecordId}>
                    <TableCell>{item.workDate}</TableCell>
                    <TableCell className="font-mono text-xs">{item.employmentId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.attendanceStatus}</Badge>
                    </TableCell>
                    <TableCell>{item.checkInAt ?? "-"}</TableCell>
                    <TableCell>{item.checkOutAt ?? "-"}</TableCell>
                    <TableCell>{item.source ?? "-"}</TableCell>
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

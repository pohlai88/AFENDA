import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@afenda/ui";
import { fetchEmployees } from "../../shared/hrm-client";
import { EmployeeStatusBadge } from "../../shared/components/employee-status-badge";
import { PositionChip } from "../../shared/components/position-chip";

interface EmployeeListItem {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  workerType: string;
  currentStatus: string;
  employmentId: string | null;
  employmentStatus: string | null;
  departmentName: string | null;
  positionTitle: string | null;
  managerDisplayName: string | null;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  limit: number;
  offset: number;
}

export default async function EmployeeListPage() {
  let data: EmployeeListResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetchEmployees({ limit: 50 });
    data = (res as { data: EmployeeListResponse }).data;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load employees";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Employee List</h1>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Employee List</h1>
          <p className="text-sm text-muted-foreground">
            Operational roster with worker status and assignment visibility.
          </p>
        </div>
        <Button asChild>
          <Link href="/hr/people/hire">Hire Employee</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Current State</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No employee records found yet. Run HR seed data or hire the first employee to populate this view.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/hr/people/hire">Hire Employee</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Employees ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((emp) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-mono text-sm">{emp.employeeCode}</TableCell>
                    <TableCell>
                      <Link
                        href={`/hr/people/employees/${emp.employeeId}`}
                        className="font-medium hover:underline"
                      >
                        {emp.displayName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <EmployeeStatusBadge status={emp.currentStatus} workerType={emp.workerType} />
                    </TableCell>
                    <TableCell>
                      {emp.positionTitle ? (
                        <PositionChip
                          positionCode={emp.positionTitle}
                          positionTitle={emp.positionTitle}
                          status={emp.employmentStatus ?? undefined}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{emp.departmentName ?? "—"}</TableCell>
                    <TableCell>{emp.managerDisplayName ?? "—"}</TableCell>
                    <TableCell>
                      {emp.employmentId && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/people/timeline/${emp.employmentId}`}>Timeline</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchEmployeeProfile } from "../../../shared/hrm-client";
import { EmployeeStatusBadge } from "../../../shared/components/employee-status-badge";
import { PositionChip } from "../../../shared/components/position-chip";

interface EmployeeProfileView {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  legalName: string;
  personalEmail: string | null;
  mobilePhone: string | null;
  currentStatus: string;
  workerType: string;
  employmentId: string | null;
  employmentStatus: string | null;
  hireDate: string | null;
  startDate: string | null;
  terminationDate: string | null;
  departmentName: string | null;
  positionTitle: string | null;
  managerDisplayName: string | null;
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  let profile: EmployeeProfileView | null = null;
  let error: string | null = null;

  try {
    const res = await fetchEmployeeProfile(employeeId);
    profile = (res as { data: EmployeeProfileView }).data;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load employee profile";
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Employee Detail</h1>
        <p className="mt-2 text-sm text-destructive">
          {error ?? "Employee detail payload is not yet available for this record."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/hr/people/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Employee profile truth, employment context, and organization placement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/hr/people/employees">Back to Employees</Link>
          </Button>
          {profile.employmentId && (
            <Button variant="outline" asChild>
              <Link href={`/hr/people/timeline/${profile.employmentId}`}>Employment Timeline</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Code:</span>{" "}
              <span className="font-mono">{profile.employeeCode}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Legal name:</span>{" "}
              {profile.legalName}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>{" "}
              <EmployeeStatusBadge status={profile.currentStatus} workerType={profile.workerType} />
            </div>
            {profile.personalEmail && (
              <div>
                <span className="text-sm text-muted-foreground">Email:</span> {profile.personalEmail}
              </div>
            )}
            {profile.mobilePhone && (
              <div>
                <span className="text-sm text-muted-foreground">Phone:</span> {profile.mobilePhone}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>{" "}
              {profile.employmentStatus ?? "—"}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Hire date:</span>{" "}
              {profile.hireDate ?? "—"}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Start date:</span>{" "}
              {profile.startDate ?? "—"}
            </div>
            {profile.terminationDate && (
              <div>
                <span className="text-sm text-muted-foreground">Termination date:</span>{" "}
                {profile.terminationDate}
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Position:</span>{" "}
              {profile.positionTitle ? (
                <PositionChip
                  positionCode={profile.employeeCode}
                  positionTitle={profile.positionTitle}
                />
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Department:</span>{" "}
              {profile.departmentName ?? "—"}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Manager:</span>{" "}
              {profile.managerDisplayName ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@afenda/ui";
import { fetchPosition } from "../../../shared/hrm-client";

interface PositionIncumbent {
  employmentId: string;
  employeeId: string;
  employeeCode: string;
  employmentStatus: string;
  effectiveFrom: string;
}

interface PositionIncumbencyView {
  positionId: string;
  positionCode: string;
  positionTitle: string;
  legalEntityId: string;
  positionStatus: string;
  headcountLimit: number;
  incumbents: PositionIncumbent[];
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;

  let data: PositionIncumbencyView | null = null;
  let error: string | null = null;

  try {
    const res = await fetchPosition(positionId);
    data = (res as { data: PositionIncumbencyView }).data;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load position";
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Position Detail</h1>
        <p className="mt-2 text-sm text-destructive">
          {error ?? "No incumbency detail found for this position."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/hr/organization/positions">Back to Positions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{data.positionTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Position occupancy, requirements, and assignment history.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/hr/organization/positions">Back to Positions</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Code:</span>{" "}
              <span className="font-mono">{data.positionCode}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status:</span> {data.positionStatus}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Headcount limit:</span>{" "}
              {data.headcountLimit}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incumbents ({data.incumbents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.incumbents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No current incumbents.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.incumbents.map((inc) => (
                    <TableRow key={inc.employmentId}>
                      <TableCell>
                        <Link
                          href={`/hr/people/employees/${inc.employeeId}`}
                          className="font-medium hover:underline"
                        >
                          {inc.employeeCode}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{inc.employeeCode}</TableCell>
                      <TableCell>{inc.employmentStatus}</TableCell>
                      <TableCell>{inc.effectiveFrom}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/people/timeline/${inc.employmentId}`}>Timeline</Link>
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
    </div>
  );
}

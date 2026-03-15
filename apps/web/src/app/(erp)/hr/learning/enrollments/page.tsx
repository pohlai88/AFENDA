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
import { fetchEnrollments } from "../../shared/hrm-client";

interface EnrollmentItem {
  enrollmentId: string;
  employmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sessionId: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

function toEnrollmentItems(data: unknown): EnrollmentItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as EnrollmentItem[]) : [];
}

export default async function MyEnrollmentsPage() {
  const res = await fetchEnrollments({ limit: 50 });
  const items = toEnrollmentItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">My Enrollments</h1>
          <p className="text-sm text-muted-foreground">
            Learning enrollments and completion status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/learning/courses">Course Catalog</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
          <CardDescription>
            Showing {items.length} enrollment{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.enrollmentId}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs">{item.courseCode}</span>
                        <span className="ml-2">{item.courseName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.completedAt ? item.completedAt.slice(0, 10) : "—"}
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

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
import { fetchCourses } from "../../shared/hrm-client";

interface CourseItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseType: string;
  provider: string | null;
  createdAt: string;
}

function toCourseItems(data: unknown): CourseItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as CourseItem[]) : [];
}

export default async function CourseCatalogPage() {
  const res = await fetchCourses({ limit: 50 });
  const items = toCourseItems(res.data);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Learning courses available for enrollment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/learning/enrollments">My Enrollments</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>
            Showing {items.length} course{items.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.courseId}>
                    <TableCell className="font-mono text-sm">{item.courseCode}</TableCell>
                    <TableCell>{item.courseName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.courseType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.provider ?? "—"}
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

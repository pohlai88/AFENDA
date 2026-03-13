import Link from "next/link";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import { fetchProjects } from "@/lib/api-client";

export const metadata = {
  title: "Projects",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "planning":
    case "on_hold":
      return "secondary";
    case "completed":
    case "archived":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function ProjectListPage() {
  const projectsRes = await fetchProjects({ limit: 50 });
  const projects = projectsRes.data;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track delivery across milestones, owners, and target dates.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/comm/projects/new">+ New Project</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total projects</p>
          <p className="mt-2 text-3xl font-semibold">{projects.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-2 text-3xl font-semibold">
            {projects.filter((project) => project.status === "active").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Planning</p>
          <p className="mt-2 text-3xl font-semibold">
            {projects.filter((project) => project.status === "planning").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 text-3xl font-semibold">
            {projects.filter((project) => project.status === "completed").length}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <p className="text-sm font-medium">No projects yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first project to organize tasks, milestones, and delivery work.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: project.color ?? "transparent" }}
                      />
                      <div>
                        <Link
                          href={`/comm/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{project.projectNumber}</p>
                        {project.description ? (
                          <p className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">
                            {project.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(project.status)} className="capitalize">
                      {formatLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {formatLabel(project.visibility)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(project.startDate)}</TableCell>
                  <TableCell>{formatDate(project.targetDate)}</TableCell>
                  <TableCell>{formatDate(project.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

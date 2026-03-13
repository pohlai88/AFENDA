import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@afenda/ui";
import { fetchChatterMessages, fetchLabels, fetchProject } from "@/lib/api-client";
import ProjectViewNav from "./ProjectViewNav";
import EntityChatterClient from "../../_components/EntityChatterClient";
import EntityLabelsClient from "../../_components/EntityLabelsClient";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

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

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  let projectRes;
  try {
    projectRes = await fetchProject(id);
  } catch {
    notFound();
  }

  const project = projectRes.data;
  const [chatterMessages, labels, allLabels] = await Promise.all([
    fetchChatterMessages({ entityType: "project", entityId: project.id })
      .then((res) => res.data)
      .catch(() => []),
    fetchLabels({ entityType: "project", entityId: project.id })
      .then((res) => res.data)
      .catch(() => []),
    fetchLabels()
      .then((res) => res.data)
      .catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{project.projectNumber}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: project.color ?? "transparent" }}
            />
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={statusVariant(project.status)} className="capitalize">
              {formatLabel(project.status)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {formatLabel(project.visibility)}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/tasks?projectId=${project.id}`}>Project Tasks</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/tasks/new?projectId=${project.id}`}>+ New Task</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/projects/${project.id}/settings`}>Settings</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/projects">Back to list</Link>
          </Button>
        </div>
      </div>

      <ProjectViewNav projectId={project.id} activeView="overview" />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
            {project.description ?? "No project description provided yet."}
          </p>
        </section>

        <aside className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Project facts</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Start date</dt>
              <dd className="font-medium">{formatDate(project.startDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Target date</dt>
              <dd className="font-medium">{formatDate(project.targetDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">{formatDate(project.completedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="font-medium">{formatDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="mt-6">
        <EntityLabelsClient
          entityType="project"
          entityId={project.id}
          labels={labels}
          allLabels={allLabels}
        />
      </div>

      <div className="mt-6">
        <EntityChatterClient
          entityType="project"
          entityId={project.id}
          messages={chatterMessages}
        />
      </div>
    </div>
  );
}

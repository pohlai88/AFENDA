import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Button } from "@afenda/ui";
import { fetchProject, fetchProjectTasks } from "@/lib/api-client";
import TaskBoardClient from "@/app/(comm)/tasks/board/TaskBoardClient";
import ProjectViewNav from "../ProjectViewNav";

export const metadata: Metadata = {
  title: "Project Board",
  description: "Status-based board for a single project",
};

interface ProjectBoardPageProps {
  params: Promise<{ id: string }>;
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

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  const { id } = await params;

  let projectRes;
  try {
    projectRes = await fetchProject(id);
  } catch {
    notFound();
  }

  const tasksRes = await fetchProjectTasks(id, {
    limit: 200,
    status: ["draft", "open", "in_progress", "review", "blocked", "done"],
  }).catch(() => ({ data: [], correlationId: "" }));

  const project = projectRes.data;
  const tasks = tasksRes.data;
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const dueSoonCount = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const diffMs = due.getTime() - Date.now();
    return diffMs >= 0 && diffMs <= 1000 * 60 * 60 * 24 * 7;
  }).length;

  return (
    <div className="mx-auto max-w-[96rem] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{project.projectNumber}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: project.color ?? "transparent" }}
            />
            <h1 className="text-3xl font-bold">{project.name} Board</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={statusVariant(project.status)} className="capitalize">
              {formatLabel(project.status)}
            </Badge>
            <Badge variant="outline">{tasks.length} tasks on board</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/tasks/new?projectId=${project.id}`}>+ New Task</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/tasks?projectId=${project.id}`}>Project Tasks</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/projects">Back to list</Link>
          </Button>
        </div>
      </div>

      <ProjectViewNav projectId={project.id} activeView="board" />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Open work</p>
          <p className="mt-2 text-3xl font-semibold">{openCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Done</p>
          <p className="mt-2 text-3xl font-semibold">{doneCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Due in 7 days</p>
          <p className="mt-2 text-3xl font-semibold">{dueSoonCount}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">No project tasks yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start the board by creating the first task for this project.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/comm/tasks/new?projectId=${project.id}`}>+ Create Project Task</Link>
            </Button>
          </div>
        </div>
      ) : (
        <TaskBoardClient tasks={tasks} />
      )}
    </div>
  );
}

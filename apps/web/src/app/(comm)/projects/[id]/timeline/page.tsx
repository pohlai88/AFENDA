import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Button, Progress } from "@afenda/ui";
import {
  fetchProject,
  fetchProjectMilestones,
  fetchProjectPhases,
  fetchProjectTasks,
} from "@/lib/api-client";
import ProjectViewNav from "../ProjectViewNav";

export const metadata: Metadata = {
  title: "Project Timeline",
  description: "Milestones, phases, and delivery timing for a project",
};

interface ProjectTimelinePageProps {
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
    case "completed":
    case "on_track":
      return "default";
    case "planning":
    case "planned":
    case "on_hold":
      return "secondary";
    case "archived":
      return "outline";
    case "cancelled":
    case "at_risk":
      return "destructive";
    default:
      return "outline";
  }
}

function getPhaseState(phase: { actualEndDate: string | null; startDate: string | null }): string {
  if (phase.actualEndDate) return "completed";
  if (!phase.startDate) return "planned";
  return new Date(phase.startDate).getTime() <= Date.now() ? "in progress" : "planned";
}

export default async function ProjectTimelinePage({ params }: ProjectTimelinePageProps) {
  const { id } = await params;

  let projectRes;
  try {
    projectRes = await fetchProject(id);
  } catch {
    notFound();
  }

  const [milestonesRes, phasesRes, tasksRes] = await Promise.all([
    fetchProjectMilestones(id).catch(() => ({ data: [], correlationId: "" })),
    fetchProjectPhases(id).catch(() => ({ data: [], correlationId: "" })),
    fetchProjectTasks(id, { limit: 200 }).catch(() => ({ data: [], correlationId: "" })),
  ]);

  const project = projectRes.data;
  const milestones = milestonesRes.data;
  const phases = phasesRes.data;
  const tasks = tasksRes.data;
  const completedTaskCount = tasks.filter((task) => task.status === "done").length;
  const completionValue =
    tasks.length === 0 ? 0 : Math.round((completedTaskCount / tasks.length) * 100);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{project.projectNumber}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: project.color ?? "transparent" }}
            />
            <h1 className="text-3xl font-bold">{project.name} Timeline</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Track phases, milestones, and overall completion without leaving the project workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/tasks?projectId=${project.id}`}>Project Tasks</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/projects">Back to list</Link>
          </Button>
        </div>
      </div>

      <ProjectViewNav projectId={project.id} activeView="timeline" />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Task completion</p>
          <p className="mt-2 text-3xl font-semibold">{completionValue}%</p>
          <Progress className="mt-3" value={completionValue} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Milestones</p>
          <p className="mt-2 text-3xl font-semibold">{milestones.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Phases</p>
          <p className="mt-2 text-3xl font-semibold">{phases.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Target date</p>
          <p className="mt-2 text-lg font-semibold">{formatDate(project.targetDate)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Phases</h2>
            <Badge variant="outline">{phases.length} total</Badge>
          </div>

          {phases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No project phases have been defined yet.
            </div>
          ) : (
            <div className="space-y-4">
              {phases.map((phase) => {
                const phaseState = getPhaseState(phase);

                return (
                  <div key={phase.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {phase.sequenceOrder}
                          </span>
                          <h3 className="font-semibold">{phase.name}</h3>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {phase.description ?? "No phase description provided."}
                        </p>
                      </div>

                      <Badge variant={phaseState === "completed" ? "default" : "outline"}>
                        {phaseState}
                      </Badge>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Start</dt>
                        <dd className="font-medium">{formatDate(phase.startDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Target end</dt>
                        <dd className="font-medium">{formatDate(phase.targetEndDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Actual end</dt>
                        <dd className="font-medium">{formatDate(phase.actualEndDate)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Milestones</h2>
              <Badge variant="outline">{milestones.length} total</Badge>
            </div>

            {milestones.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No milestones have been scheduled yet.
              </div>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {milestone.milestoneNumber}
                        </p>
                        <h3 className="mt-1 font-semibold">{milestone.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {milestone.description ?? "No milestone description provided."}
                        </p>
                      </div>
                      <Badge variant={statusVariant(milestone.status)} className="capitalize">
                        {formatLabel(milestone.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground">
                      Target:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(milestone.targetDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent project tasks</h2>
              <Badge variant="outline">{tasks.length}</Badge>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                This project does not have any tasks yet.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 6).map((task) => (
                  <Link
                    key={task.id}
                    href={`/comm/tasks/${task.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {task.taskNumber}
                        </p>
                        <h3 className="mt-1 font-semibold">{task.title}</h3>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {formatLabel(task.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Due {formatDate(task.dueDate)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchSavedViews, fetchTasks } from "@/lib/api-client";
import TaskListClient from "./TaskListClient";
import TaskFilters from "./TaskFilters";
import TaskSavedViewsBar from "./TaskSavedViewsBar";

interface TaskListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** COMM Tasks list — server-fetched data, client interactivity. */
export default async function TaskListPage({ searchParams }: TaskListPageProps) {
  const params = await searchParams;
  const statusParam = params.status
    ? Array.isArray(params.status)
      ? params.status
      : [params.status]
    : undefined;
  const assigneeId = typeof params.assigneeId === "string" ? params.assigneeId : undefined;
  const projectId = typeof params.projectId === "string" ? params.projectId : undefined;
  const limit = typeof params.limit === "string" ? parseInt(params.limit) : 20;
  const selectedViewId = typeof params.viewId === "string" ? params.viewId : undefined;

  const savedViewsRes = await fetchSavedViews({ entityType: "task" }).catch(() => ({ data: [] }));
  const savedViews = savedViewsRes.data;

  const selectedView = selectedViewId
    ? savedViews.find((view) => view.id === selectedViewId)
    : undefined;
  const defaultView =
    !selectedView && !statusParam && !assigneeId && !projectId
      ? savedViews.find((view) => view.isDefault)
      : undefined;
  const activeView = selectedView ?? defaultView;

  const viewFilters =
    activeView && activeView.filters && typeof activeView.filters === "object"
      ? activeView.filters
      : {};

  const savedStatus = Array.isArray(viewFilters.status)
    ? viewFilters.status.filter((value): value is string => typeof value === "string")
    : undefined;
  const savedAssigneeId =
    typeof viewFilters.assigneeId === "string" ? viewFilters.assigneeId : undefined;
  const savedProjectId =
    typeof viewFilters.projectId === "string" ? viewFilters.projectId : undefined;
  const savedLimit = typeof viewFilters.limit === "number" ? viewFilters.limit : undefined;

  const status = statusParam ?? savedStatus;
  const resolvedAssigneeId = assigneeId ?? savedAssigneeId;
  const resolvedProjectId = projectId ?? savedProjectId;
  const resolvedLimit =
    typeof limit === "number" && !Number.isNaN(limit) ? limit : (savedLimit ?? 20);

  const tasksRes = await fetchTasks({
    limit: resolvedLimit,
    status,
    assigneeId: resolvedAssigneeId,
    projectId: resolvedProjectId,
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          {projectId ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Showing tasks scoped to the selected project.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/tasks/my">My Tasks</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/tasks/board">Team Board</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/tasks/new">+ New Task</Link>
          </Button>
        </div>
      </div>

      <TaskSavedViewsBar
        savedViews={savedViews}
        activeViewId={activeView?.id ?? null}
        currentFilters={{
          status,
          assigneeId: resolvedAssigneeId,
          projectId: resolvedProjectId,
          limit: resolvedLimit,
        }}
      />

      <TaskFilters />

      {tasksRes.data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No tasks match the current view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust filters or save a new view with broader criteria.
          </p>
        </div>
      ) : (
        <TaskListClient
          initialData={tasksRes.data}
          initialCursor={tasksRes.cursor ?? null}
          initialHasMore={tasksRes.hasMore ?? false}
        />
      )}
    </div>
  );
}

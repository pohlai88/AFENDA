"use client";

import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@afenda/ui";
import type { TaskRow } from "@/lib/api-client";
import { transitionTaskStatus } from "@/lib/api-client";

const BOARD_COLUMNS = [
  { key: "draft", title: "Draft" },
  { key: "open", title: "Open" },
  { key: "in_progress", title: "In Progress" },
  { key: "review", title: "Review" },
  { key: "blocked", title: "Blocked" },
  { key: "done", title: "Done" },
] as const;

const TASK_STATUS_TRANSITIONS = {
  draft: ["open", "archived", "cancelled"],
  open: ["in_progress", "blocked", "done", "cancelled", "archived"],
  in_progress: ["review", "blocked", "done", "cancelled", "archived"],
  review: ["in_progress", "done", "blocked", "cancelled", "archived"],
  blocked: ["open", "in_progress", "cancelled", "archived"],
  done: ["archived"],
  cancelled: ["archived"],
  archived: [],
} as const;

type BoardColumnKey = (typeof BOARD_COLUMNS)[number]["key"];
type TaskStatusKey = keyof typeof TASK_STATUS_TRANSITIONS;
type TaskPriorityKey = "critical" | "high" | "medium" | "low" | "none";

const TASK_PRIORITIES: TaskPriorityKey[] = ["critical", "high", "medium", "low", "none"];

const TASK_DRAG_PREFIX = "task:";
const COLUMN_DROP_PREFIX = "column:";

interface TaskBoardClientProps {
  tasks: TaskRow[];
}

function isTaskStatusKey(value: string): value is TaskStatusKey {
  return value in TASK_STATUS_TRANSITIONS;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function toTaskDragId(taskId: string): string {
  return `${TASK_DRAG_PREFIX}${taskId}`;
}

function toColumnDropId(status: BoardColumnKey): string {
  return `${COLUMN_DROP_PREFIX}${status}`;
}

function parseTaskIdFromDragId(id: string): string | null {
  return id.startsWith(TASK_DRAG_PREFIX) ? id.slice(TASK_DRAG_PREFIX.length) : null;
}

function parseColumnKeyFromDropId(id: string): BoardColumnKey | null {
  if (!id.startsWith(COLUMN_DROP_PREFIX)) return null;
  const key = id.slice(COLUMN_DROP_PREFIX.length);
  return BOARD_COLUMNS.some((column) => column.key === key) ? (key as BoardColumnKey) : null;
}

interface TaskCardProps {
  task: TaskRow;
  currentStatus: TaskStatusKey | undefined;
  nextStatuses: readonly string[];
  isTransitioning: boolean;
  onTransition: (taskId: string, toStatus: string) => Promise<void>;
}

function TaskCard({
  task,
  currentStatus,
  nextStatuses,
  isTransitioning,
  onTransition,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: toTaskDragId(task.id),
    data: {
      taskId: task.id,
      status: currentStatus,
    },
    disabled: isTransitioning,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-background p-3 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="mb-2 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={isTransitioning}
          aria-label={`Drag ${task.taskNumber}`}
          {...listeners}
          {...attributes}
        >
          Drag
        </Button>
      </div>

      <Link href={`/comm/tasks/${task.id}`} className="block hover:opacity-90">
        <p className="mb-1 line-clamp-2 text-sm font-medium">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.taskNumber}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{task.priority}</span>
          <span>{task.dueDate ?? "No due date"}</span>
        </div>
      </Link>

      <div className="mt-3 space-y-1">
        {nextStatuses.map((status) => (
          <Button
            key={`${task.id}-${status}`}
            type="button"
            size="sm"
            variant="outline"
            disabled={isTransitioning}
            onClick={() => {
              void onTransition(task.id, status);
            }}
            className="w-full justify-start text-xs capitalize"
            aria-label={`Move ${task.taskNumber} to ${formatStatusLabel(status)}`}
          >
            Move to {formatStatusLabel(status)}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface BoardColumnProps {
  column: (typeof BOARD_COLUMNS)[number];
  items: TaskRow[];
  statusOverrides: Record<string, TaskStatusKey>;
  isTransitioningTaskId: string | null;
  onTransition: (taskId: string, toStatus: string) => Promise<void>;
}

function BoardColumn({
  column,
  items,
  statusOverrides,
  isTransitioningTaskId,
  onTransition,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: toColumnDropId(column.key) });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-lg border bg-card p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{column.title}</h2>
        <Badge variant="secondary">{items.length}</Badge>
      </header>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No tasks
          </div>
        ) : (
          items.map((task) => {
            const effectiveStatus = statusOverrides[task.id] ?? task.status;
            const currentStatus = isTaskStatusKey(effectiveStatus) ? effectiveStatus : undefined;
            const nextStatuses = currentStatus ? TASK_STATUS_TRANSITIONS[currentStatus] : [];

            return (
              <TaskCard
                key={task.id}
                task={task}
                currentStatus={currentStatus}
                nextStatuses={nextStatuses}
                isTransitioning={isTransitioningTaskId === task.id}
                onTransition={onTransition}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

export default function TaskBoardClient({ tasks }: TaskBoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const priorityParams = searchParams.getAll("priority") as TaskPriorityKey[];

  const [searchText, setSearchText] = useState(queryParam);
  const [isTransitioningTaskId, setIsTransitioningTaskId] = useState<string | null>(null);
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatusKey>>({});
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    setSearchText(queryParam);
  }, [queryParam]);

  const pushFilters = (next: { q: string; priorities: TaskPriorityKey[] }) => {
    const params = new URLSearchParams();
    const trimmedQuery = next.q.trim();

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    }

    next.priorities.forEach((priority) => {
      params.append("priority", priority);
    });

    const query = params.toString();
    router.push(query ? `/comm/tasks/board?${query}` : "/comm/tasks/board");
  };

  const togglePriority = (priority: TaskPriorityKey) => {
    const isActive = priorityParams.includes(priority);
    const nextPriorities = isActive
      ? priorityParams.filter((currentPriority) => currentPriority !== priority)
      : [...priorityParams, priority];

    pushFilters({ q: queryParam, priorities: nextPriorities });
  };

  const filteredTasks = useMemo(() => {
    const normalizedQuery = queryParam.trim().toLowerCase();

    return tasks.filter((task) => {
      const effectiveStatus = statusOverrides[task.id] ?? task.status;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.taskNumber.toLowerCase().includes(normalizedQuery) ||
        (task.description?.toLowerCase().includes(normalizedQuery) ?? false);

      const matchesPriority =
        priorityParams.length === 0 ||
        priorityParams.includes((task.priority ?? "none") as TaskPriorityKey);

      return matchesQuery && matchesPriority && isTaskStatusKey(effectiveStatus);
    });
  }, [priorityParams, queryParam, statusOverrides, tasks]);

  const tasksByStatus = useMemo(
    () =>
      BOARD_COLUMNS.reduce<Record<BoardColumnKey, TaskRow[]>>(
        (acc, column) => {
          acc[column.key] = filteredTasks.filter(
            (task) => (statusOverrides[task.id] ?? task.status) === column.key,
          );
          return acc;
        },
        {
          draft: [],
          open: [],
          in_progress: [],
          review: [],
          blocked: [],
          done: [],
        },
      ),
    [filteredTasks, statusOverrides],
  );

  const handleTransition = async (taskId: string, toStatus: string) => {
    const task = tasks.find((currentTask) => currentTask.id === taskId);
    if (!task) return;
    if (!isTaskStatusKey(toStatus)) return;

    const fromStatus = statusOverrides[taskId] ?? task.status;
    if (!isTaskStatusKey(fromStatus)) return;

    setError(null);
    setIsTransitioningTaskId(taskId);
    setStatusOverrides((current) => ({
      ...current,
      [taskId]: toStatus,
    }));

    try {
      await transitionTaskStatus({ taskId, toStatus });
      router.refresh();
    } catch (err) {
      setError(String(err));
      setStatusOverrides((current) => ({
        ...current,
        [taskId]: fromStatus,
      }));
    } finally {
      setIsTransitioningTaskId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseTaskIdFromDragId(String(event.active.id));
    setActiveDragTaskId(taskId);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDragTaskId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const taskId = parseTaskIdFromDragId(String(event.active.id));
    const targetColumn = event.over ? parseColumnKeyFromDropId(String(event.over.id)) : null;

    if (!taskId || !targetColumn) {
      setActiveDragTaskId(null);
      return;
    }

    const droppedTask = tasks.find((task) => task.id === taskId);
    if (!droppedTask) {
      setActiveDragTaskId(null);
      return;
    }

    const droppedTaskStatus = statusOverrides[droppedTask.id] ?? droppedTask.status;
    if (!isTaskStatusKey(droppedTaskStatus)) {
      setActiveDragTaskId(null);
      return;
    }

    if (droppedTaskStatus === targetColumn) {
      setActiveDragTaskId(null);
      return;
    }

    const validTargets = TASK_STATUS_TRANSITIONS[droppedTaskStatus] as readonly string[];
    if (!validTargets.includes(targetColumn)) {
      setError(
        `Cannot move task from ${formatStatusLabel(droppedTaskStatus)} to ${formatStatusLabel(targetColumn)}.`,
      );
      setActiveDragTaskId(null);
      return;
    }

    await handleTransition(taskId, targetColumn);
    setActiveDragTaskId(null);
  };

  const activeDragTask = activeDragTaskId
    ? tasks.find((task) => task.id === activeDragTaskId)
    : null;

  return (
    <>
      <section className="mb-4 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              pushFilters({ q: searchText, priorities: priorityParams });
            }}
            className="flex min-w-[18rem] flex-1 items-center gap-2"
          >
            <Input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
              }}
              placeholder="Search by title or task number"
            />
            <Button type="submit" size="sm" variant="outline">
              Apply
            </Button>
          </form>

          {TASK_PRIORITIES.map((priority) => (
            <Button
              key={priority}
              type="button"
              size="sm"
              variant={priorityParams.includes(priority) ? "default" : "outline"}
              onClick={() => {
                togglePriority(priority);
              }}
              className="capitalize"
            >
              {priority}
            </Button>
          ))}

          {(queryParam.length > 0 || priorityParams.length > 0) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchText("");
                pushFilters({ q: "", priorities: [] });
              }}
            >
              Clear
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            Showing {filteredTasks.length} of {tasks.length}
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Unable to transition task</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={(event) => {
          void handleDragEnd(event);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumn
              key={column.key}
              column={column}
              items={tasksByStatus[column.key]}
              statusOverrides={statusOverrides}
              isTransitioningTaskId={isTransitioningTaskId}
              onTransition={handleTransition}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragTask ? (
            <div className="w-64 rounded-md border bg-background p-3 shadow-lg">
              <p className="line-clamp-2 text-sm font-medium">{activeDragTask.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeDragTask.taskNumber}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

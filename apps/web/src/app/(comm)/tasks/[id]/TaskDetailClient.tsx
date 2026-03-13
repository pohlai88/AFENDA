/**
 * Task detail client — interactive detail view with actions.
 */

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@afenda/ui";
import type {
  CommChatterMessageRow,
  CommLabelRow,
  CommSubscriptionRow,
  TaskChecklistItemRow,
  TaskRow,
  TaskTimeEntryRow,
} from "@/lib/api-client";
import {
  addTaskChecklist,
  logTaskTimeEntry,
  subscribeEntity,
  toggleTaskChecklistItem,
  transitionTaskStatus,
  unsubscribeEntity,
} from "@/lib/api-client";
import EntityChatterClient from "../../_components/EntityChatterClient";
import EntityLabelsClient from "../../_components/EntityLabelsClient";

interface TaskDetailClientProps {
  task: TaskRow;
  checklistItems: TaskChecklistItemRow[];
  timeEntries: TaskTimeEntryRow[];
  chatterMessages: CommChatterMessageRow[];
  labels: CommLabelRow[];
  allLabels: CommLabelRow[];
  subscriptions: CommSubscriptionRow[];
  currentPrincipalId: string | null;
}

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

type TaskStatusKey = keyof typeof TASK_STATUS_TRANSITIONS;

function isTaskStatusKey(value: string): value is TaskStatusKey {
  return value in TASK_STATUS_TRANSITIONS;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default function TaskDetailClient({
  task,
  checklistItems,
  timeEntries,
  chatterMessages,
  labels,
  allLabels,
  subscriptions,
  currentPrincipalId,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
  const [isTogglingChecklist, setIsTogglingChecklist] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = isTaskStatusKey(task.status) ? task.status : undefined;
  const isSubscribed =
    Boolean(currentPrincipalId) &&
    subscriptions.some((sub) => sub.principalId === currentPrincipalId);
  const watcherCount = subscriptions.length;
  const nextStatuses = currentStatus ? TASK_STATUS_TRANSITIONS[currentStatus] : [];

  const handleTransition = async (toStatus: string) => {
    if (toStatus === task.status) return;

    setIsTransitioning(true);
    setError(null);

    try {
      await transitionTaskStatus({
        taskId: task.id,
        toStatus,
      });
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleChecklistToggle = async (item: TaskChecklistItemRow) => {
    setIsTogglingChecklist(true);
    setError(null);

    try {
      await toggleTaskChecklistItem({
        taskId: task.id,
        checklistItemId: item.id,
        checked: !item.isChecked,
      });
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsTogglingChecklist(false);
    }
  };

  const handleAddChecklistItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingChecklistItem(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const text = String(formData.get("checklistText") ?? "").trim();

    if (!text) {
      setError("Checklist item text is required.");
      setIsAddingChecklistItem(false);
      return;
    }

    try {
      await addTaskChecklist({
        taskId: task.id,
        items: [text],
      });
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsAddingChecklistItem(false);
    }
  };

  const handleToggleSubscription = async () => {
    if (!currentPrincipalId) {
      setError("You must be signed in to watch this task.");
      return;
    }

    setIsUpdatingSubscription(true);
    setError(null);

    try {
      if (isSubscribed) {
        await unsubscribeEntity({ entityType: "task", entityId: task.id });
      } else {
        await subscribeEntity({ entityType: "task", entityId: task.id });
      }
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const handleLogTime = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingTime(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const minutesRaw = formData.get("minutes");
    const entryDateRaw = formData.get("entryDate");
    const descriptionRaw = formData.get("description");

    try {
      await logTaskTimeEntry({
        taskId: task.id,
        minutes: Number(minutesRaw),
        entryDate: String(entryDateRaw),
        description: descriptionRaw ? String(descriptionRaw).trim() || undefined : undefined,
      });
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoggingTime(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        {task.description && (
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Checklist</h2>
          {checklistItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No checklist items</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {checklistItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <Button
                    type="button"
                    onClick={() => {
                      void handleChecklistToggle(item);
                    }}
                    disabled={isTogglingChecklist}
                    variant="outline"
                    size="sm"
                    className={`mt-0.5 h-5 w-5 p-0 text-[10px] transition ${
                      item.isChecked
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    aria-label={item.isChecked ? "Mark unchecked" : "Mark checked"}
                  >
                    {item.isChecked ? "✓" : ""}
                  </Button>
                  <span className={item.isChecked ? "text-muted-foreground line-through" : ""}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(e) => {
              void handleAddChecklistItem(e);
            }}
            className="mt-4 flex items-end gap-2 border-t pt-4"
          >
            <div className="flex-1">
              <Label htmlFor="checklistText" className="text-xs text-muted-foreground">
                Add checklist item
              </Label>
              <Input
                id="checklistText"
                name="checklistText"
                maxLength={500}
                required
                className="mt-1"
                placeholder="Define next checklist step"
              />
            </div>
            <Button type="submit" size="sm" disabled={isAddingChecklistItem}>
              {isAddingChecklistItem ? "Adding..." : "Add"}
            </Button>
          </form>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Time Entries</h2>
          {timeEntries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No time entries yet</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {timeEntries.map((entry) => (
                <li key={entry.id} className="rounded-md bg-muted/30 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.minutes} min</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(e) => {
              void handleLogTime(e);
            }}
            className="mt-4 space-y-3 border-t pt-4"
          >
            <h3 className="text-sm font-medium">Log time</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  required
                  className="mt-1"
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="entryDate" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <Input id="entryDate" name="entryDate" type="date" required className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-xs text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="description"
                name="description"
                className="mt-1"
                rows={2}
                maxLength={2000}
                placeholder="Optional notes"
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoggingTime}>
              {isLoggingTime ? "Logging..." : "Log Time"}
            </Button>
          </form>
        </div>

        <EntityChatterClient entityType="task" entityId={task.id} messages={chatterMessages} />
        <EntityLabelsClient
          entityType="task"
          entityId={task.id}
          labels={labels}
          allLabels={allLabels}
        />
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">Error</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Watchers</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {watcherCount} {watcherCount === 1 ? "subscriber" : "subscribers"}
          </p>
          <Button
            type="button"
            variant={isSubscribed ? "secondary" : "outline"}
            className="mt-3 w-full"
            disabled={isUpdatingSubscription || !currentPrincipalId}
            onClick={() => {
              void handleToggleSubscription();
            }}
          >
            {isUpdatingSubscription ? "Updating..." : isSubscribed ? "Unwatch" : "Watch"}
          </Button>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Due Date</dt>
              <dd>{task.dueDate || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estimate</dt>
              <dd>{task.estimateMinutes ? `${task.estimateMinutes} min` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actual Time</dt>
              <dd>{task.actualMinutes ? `${task.actualMinutes} min` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(task.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-1 text-sm font-semibold">Status</h3>
          <p className="mb-3 text-xs text-muted-foreground capitalize">
            Current: {formatStatusLabel(task.status)}
          </p>
          <div className="space-y-2">
            {nextStatuses.length > 0 ? (
              nextStatuses.map((status) => (
                <Button
                  key={status}
                  onClick={() => {
                    void handleTransition(status);
                  }}
                  disabled={isTransitioning}
                  variant="outline"
                  className="block w-full text-left text-sm capitalize transition hover:bg-accent disabled:opacity-50"
                >
                  Move to {formatStatusLabel(status)}
                </Button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                {currentStatus
                  ? "No available transitions for this status."
                  : "Unknown task status. Transition actions are unavailable."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Task list client — interactive table with pagination and bulk operations.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@afenda/ui";
import type { TaskRow } from "@/lib/api-client";
import { fetchTasks, bulkAssignTasks, bulkTransitionTaskStatus } from "@/lib/api-client";

interface TaskListClientProps {
  initialData: TaskRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

const TASK_STATUSES = [
  "draft",
  "open",
  "in_progress",
  "review",
  "blocked",
  "done",
  "cancelled",
  "archived",
] as const;

export default function TaskListClient({
  initialData,
  initialCursor,
  initialHasMore,
}: TaskListClientProps) {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState(initialData);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"assign" | "transition" | null>(null);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const allSelected = selectedIds.size > 0 && selectedIds.size === tasks.length;
  const somethingSelected = selectedIds.size > 0;

  const toggleSelect = (taskId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const loadMore = async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const statuses = searchParams.getAll("status");
      const assigneeId = searchParams.get("assigneeId") ?? undefined;
      const projectId = searchParams.get("projectId") ?? undefined;
      const res = await fetchTasks({
        cursor,
        limit: 20,
        status: statuses.length > 0 ? statuses : undefined,
        assigneeId,
        projectId,
      });
      setTasks((prev) => [...prev, ...res.data]);
      setCursor(res.cursor ?? null);
      setHasMore(res.hasMore ?? false);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssigneeId || selectedIds.size === 0) return;

    setIsBulkSubmitting(true);
    setBulkError(null);

    try {
      await bulkAssignTasks({
        taskIds: Array.from(selectedIds),
        assigneeId: bulkAssigneeId,
      });

      // Reload data
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkAssigneeId("");
      window.location.reload();
    } catch (err) {
      setBulkError(String(err));
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkTransition = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;

    setIsBulkSubmitting(true);
    setBulkError(null);

    try {
      await bulkTransitionTaskStatus({
        taskIds: Array.from(selectedIds),
        toStatus: bulkStatus,
        reason: bulkReason || undefined,
      });

      // Reload data
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkStatus("");
      setBulkReason("");
      window.location.reload();
    } catch (err) {
      setBulkError(String(err));
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {somethingSelected && (
        <div className="mb-4 rounded-lg bg-accent/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkAction("assign")}>
                Assign
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkAction("transition")}>
                Change Status
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">
              {bulkAction === "assign" ? "Assign Tasks" : "Change Status"}
            </h2>

            {bulkError && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {bulkError}
              </div>
            )}

            {bulkAction === "assign" && (
              <div className="mb-4">
                <Label htmlFor="assignee-id" className="block text-sm font-medium">
                  Assignee Email or ID
                </Label>
                <Input
                  id="assignee-id"
                  type="text"
                  placeholder="user@example.com or UUID"
                  value={bulkAssigneeId}
                  onChange={(e) => setBulkAssigneeId(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {bulkAction === "transition" && (
              <>
                <div className="mb-4">
                  <Label htmlFor="status" className="block text-sm font-medium">
                    New Status
                  </Label>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger id="status" className="mt-1 w-full">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4">
                  <Label htmlFor="reason" className="block text-sm font-medium">
                    Reason (optional)
                  </Label>
                  <Input
                    id="reason"
                    type="text"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    className="mt-1"
                    placeholder="Why?"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void (bulkAction === "assign" ? handleBulkAssign() : handleBulkTransition());
                }}
                disabled={
                  isBulkSubmitting ||
                  (bulkAction === "assign" && !bulkAssigneeId) ||
                  (bulkAction === "transition" && !bulkStatus)
                }
                className="flex-1"
              >
                {isBulkSubmitting ? "Submitting..." : "Submit"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkAction(null);
                  setBulkError(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Table */}
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (Boolean(checked) !== allSelected) {
                        toggleSelectAll();
                      }
                    }}
                    title={somethingSelected ? "Deselect all" : "Select all"}
                    aria-label={somethingSelected ? "Deselect all tasks" : "Select all tasks"}
                  />
                </th>
                <th className="px-4 py-2 text-left font-medium">Number</th>
                <th className="px-4 py-2 text-left font-medium">Title</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Priority</th>
                <th className="px-4 py-2 text-left font-medium">Due Date</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`border-b transition-colors ${
                    selectedIds.has(task.id) ? "bg-accent/60" : "hover:bg-muted/50"
                  }`}
                >
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={(checked) => {
                        const isChecked = selectedIds.has(task.id);
                        if (Boolean(checked) !== isChecked) {
                          toggleSelect(task.id);
                        }
                      }}
                      aria-label={`Select task ${task.taskNumber}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/comm/tasks/${task.id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {task.taskNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/comm/tasks/${task.id}`} className="text-primary hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{task.priority}</td>
                  <td className="px-4 py-2">{task.dueDate || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => {
              void loadMore();
            }}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </>
  );
}

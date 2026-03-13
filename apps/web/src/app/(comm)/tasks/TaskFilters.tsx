"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@afenda/ui";
import { AlertCircle, Archive, CheckCircle2, Clock, FileText, Zap, XCircle } from "lucide-react";
import type { TaskStatus } from "@afenda/contracts";

const TASK_STATUSES: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { value: "draft", label: "Draft", icon: <FileText className="h-4 w-4" /> },
  { value: "open", label: "Open", icon: <AlertCircle className="h-4 w-4" /> },
  { value: "in_progress", label: "In Progress", icon: <Zap className="h-4 w-4" /> },
  { value: "review", label: "Review", icon: <Clock className="h-4 w-4" /> },
  { value: "blocked", label: "Blocked", icon: <XCircle className="h-4 w-4" /> },
  { value: "done", label: "Done", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "cancelled", label: "Cancelled", icon: <XCircle className="h-4 w-4" /> },
  { value: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
];

/** Client-side filter UI with URL param sync. */
export default function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(() => {
    const statuses = searchParams.getAll("status");
    return statuses as TaskStatus[];
  });

  const updateFilters = (newStatuses: TaskStatus[]) => {
    setSelectedStatuses(newStatuses);
    const params = new URLSearchParams(searchParams.toString());

    // Manual filtering intentionally detaches any previously selected saved view.
    params.delete("viewId");
    params.delete("status");
    newStatuses.forEach((s) => params.append("status", s));
    const query = params.toString();
    router.push(query ? `/comm/tasks?${query}` : "/comm/tasks");
  };

  const toggleStatus = (status: TaskStatus) => {
    const nextStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    updateFilters(nextStatuses);
  };

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TASK_STATUSES.map(({ value, label, icon }) => (
        <Button
          key={value}
          variant={selectedStatuses.includes(value) ? "default" : "outline"}
          size="sm"
          onClick={() => {
            toggleStatus(value);
          }}
          className={`inline-flex items-center gap-2 ${
            selectedStatuses.includes(value) ? "" : "hover:bg-accent"
          }`}
        >
          {icon}
          {label}
        </Button>
      ))}
      {selectedStatuses.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => updateFilters([])} className="ml-2">
          Clear Filters
        </Button>
      )}
    </div>
  );
}

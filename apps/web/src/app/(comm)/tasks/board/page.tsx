import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@afenda/ui";
import { fetchTasks } from "@/lib/api-client";
import TaskBoardClient from "./TaskBoardClient";

export const metadata: Metadata = {
  title: "Team Board",
  description: "Kanban-style view of team tasks grouped by status",
};

export default async function TaskBoardPage() {
  const tasksRes = await fetchTasks({
    limit: 200,
    status: ["draft", "open", "in_progress", "review", "blocked", "done"],
  });

  return (
    <div className="mx-auto max-w-[96rem] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status-based view of current team work items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/tasks">Table View</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/tasks/new">+ New Task</Link>
          </Button>
        </div>
      </div>

      <TaskBoardClient tasks={tasksRes.data} />
    </div>
  );
}

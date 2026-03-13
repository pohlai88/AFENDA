import type { Metadata } from "next";
import { auth } from "@/auth";
import { fetchTasks } from "@/lib/api-client";
import TaskListClient from "../TaskListClient";

export const metadata: Metadata = {
  title: "My Tasks",
  description: "Tasks assigned to you",
};

export default async function MyTasksPage() {
  const session = await auth();
  const assigneeId = session?.user?.id;

  const tasksRes = assigneeId
    ? await fetchTasks({ assigneeId, status: ["open", "in_progress", "blocked", "review"] })
    : { data: [], cursor: null, hasMore: false };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tasks currently assigned to you</p>
      </div>

      <TaskListClient
        initialData={tasksRes.data}
        initialCursor={tasksRes.cursor ?? null}
        initialHasMore={tasksRes.hasMore ?? false}
      />
    </div>
  );
}

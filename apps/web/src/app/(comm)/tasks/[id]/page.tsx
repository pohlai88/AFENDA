import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@afenda/ui";
import { auth } from "@/auth";
import {
  fetchChatterMessages,
  fetchLabels,
  fetchSubscriptions,
  fetchTask,
  fetchTaskChecklist,
  fetchTaskTimeEntries,
} from "@/lib/api-client";
import TaskDetailClient from "./TaskDetailClient";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const currentPrincipalId = session?.user?.id ?? null;

  let taskRes;
  try {
    taskRes = await fetchTask(id);
  } catch {
    notFound();
  }

  const [checklistItems, timeEntries, chatterMessages, labels, allLabels, subscriptions] =
    await Promise.all([
      fetchTaskChecklist(id)
        .then((res) => res.data)
        .catch(() => []),
      fetchTaskTimeEntries(id)
        .then((res) => res.data)
        .catch(() => []),
      fetchChatterMessages({ entityType: "task", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
      fetchLabels({ entityType: "task", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
      fetchLabels()
        .then((res) => res.data)
        .catch(() => []),
      fetchSubscriptions({ entityType: "task", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
    ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{taskRes.data.taskNumber}</p>
          <h1 className="mt-1 text-3xl font-bold">{taskRes.data.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
              {taskRes.data.status}
            </span>
            <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
              {taskRes.data.priority}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/comm/tasks/${id}/edit`}>Edit</Link>
        </Button>
      </div>

      <TaskDetailClient
        task={taskRes.data}
        checklistItems={checklistItems}
        timeEntries={timeEntries}
        chatterMessages={chatterMessages}
        labels={labels}
        allLabels={allLabels}
        subscriptions={subscriptions}
        currentPrincipalId={currentPrincipalId}
      />
    </div>
  );
}

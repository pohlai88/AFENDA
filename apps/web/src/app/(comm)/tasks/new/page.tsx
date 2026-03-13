import Link from "next/link";
import type { Metadata } from "next";
import NewTaskForm from "./NewTaskForm";

export const metadata: Metadata = {
  title: "New Task",
};

interface NewTaskPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const params = await searchParams;
  const defaultProjectId = typeof params.projectId === "string" ? params.projectId : undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Task</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {defaultProjectId
            ? "Add a new task linked to the selected project"
            : "Add a new task to your workload"}
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <NewTaskForm defaultProjectId={defaultProjectId} />
      </div>

      <div className="mt-4">
        <Link href="/comm/tasks" className="text-sm text-primary hover:underline">
          ← Back to tasks
        </Link>
      </div>
    </div>
  );
}

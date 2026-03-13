import Link from "next/link";
import NewProjectForm from "./NewProjectForm";

export const metadata = {
  title: "New Project",
};

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the delivery scope, dates, and visibility for a new COMM project.
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <NewProjectForm />
      </div>

      <div className="mt-4">
        <Link href="/comm/projects" className="text-sm text-primary hover:underline">
          ← Back to projects
        </Link>
      </div>
    </div>
  );
}

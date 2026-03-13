import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@afenda/ui";
import { fetchProject, fetchProjectMembers, fetchProjectMilestones } from "@/lib/api-client";
import ProjectViewNav from "../ProjectViewNav";
import ProjectSettingsClient from "./ProjectSettingsClient";

export const metadata: Metadata = {
  title: "Project Settings",
  description: "Manage project details, status, members, and milestones",
};

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "planning":
    case "on_hold":
      return "secondary";
    case "completed":
    case "archived":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { id } = await params;

  let projectRes;
  try {
    projectRes = await fetchProject(id);
  } catch {
    notFound();
  }

  const [membersRes, milestonesRes] = await Promise.all([
    fetchProjectMembers(id).catch(() => ({ data: [], correlationId: "" })),
    fetchProjectMilestones(id).catch(() => ({ data: [], correlationId: "" })),
  ]);

  const project = projectRes.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{project.projectNumber}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: project.color ?? "transparent" }}
            />
            <h1 className="text-3xl font-bold">{project.name} Settings</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={statusVariant(project.status)} className="capitalize">
              {formatLabel(project.status)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {formatLabel(project.visibility)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/comm/projects/${project.id}`}>Overview</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/projects">Back to list</Link>
          </Button>
        </div>
      </div>

      <ProjectViewNav projectId={project.id} activeView="settings" />

      <ProjectSettingsClient
        project={project}
        members={membersRes.data}
        milestones={milestonesRes.data}
      />
    </div>
  );
}

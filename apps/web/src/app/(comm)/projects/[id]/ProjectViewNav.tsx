import Link from "next/link";
import { Button } from "@afenda/ui";

interface ProjectViewNavProps {
  projectId: string;
  activeView: "overview" | "board" | "timeline" | "settings";
}

const PROJECT_VIEWS = [
  {
    key: "overview",
    label: "Overview",
    href: (projectId: string) => `/comm/projects/${projectId}`,
  },
  {
    key: "board",
    label: "Board",
    href: (projectId: string) => `/comm/projects/${projectId}/board`,
  },
  {
    key: "timeline",
    label: "Timeline",
    href: (projectId: string) => `/comm/projects/${projectId}/timeline`,
  },
  {
    key: "settings",
    label: "Settings",
    href: (projectId: string) => `/comm/projects/${projectId}/settings`,
  },
] as const;

export default function ProjectViewNav({ projectId, activeView }: ProjectViewNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {PROJECT_VIEWS.map((view) => (
        <Button
          key={view.key}
          variant={view.key === activeView ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href={view.href(projectId)}>{view.label}</Link>
        </Button>
      ))}
    </div>
  );
}

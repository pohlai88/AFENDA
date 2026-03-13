import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@afenda/ui";
import { fetchCapabilities, fetchWorkflows, type WorkflowRow } from "@/lib/api-client";
import WorkflowsGeneratedListClient from "./WorkflowsGeneratedListClient";

export const metadata: Metadata = {
  title: "Workflows - AFENDA",
  description: "Automations for communication workflows",
};

type WorkflowStatusValue = "draft" | "active" | "paused" | "archived";

const STATUS_OPTIONS: Array<{ value: "all" | WorkflowStatusValue; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

function toGeneratedListRows(workflows: WorkflowRow[]): Record<string, unknown>[] {
  return workflows.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    triggerType: workflow.trigger.type,
    actionsCount: workflow.actions.length,
    runCount: workflow.runCount,
    lastTriggeredAt: workflow.lastTriggeredAt,
    updatedAt: workflow.updatedAt,
    createdAt: workflow.createdAt,
  }));
}

function normalizeStatus(value: string | undefined): "all" | WorkflowStatusValue {
  if (!value || value === "all") return "all";
  if (value === "draft" || value === "active" || value === "paused" || value === "archived") {
    return value;
  }
  return "all";
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const statusParam = await searchParams;
  const statusFilter = normalizeStatus(statusParam?.status);
  const [workflowsResponse, capabilitiesResponse] = await Promise.all([
    fetchWorkflows(statusFilter === "all" ? undefined : { status: statusFilter }),
    fetchCapabilities("comm.workflow"),
  ]);

  const workflows = workflowsResponse.data;
  const listRows = toGeneratedListRows(workflows);
  const capabilities = capabilitiesResponse.data;

  const selectedStatusLabel =
    STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? "All statuses";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Automate tasks, notifications, and process orchestration.
          </p>
        </div>
        <Link href="/comm/workflows/new">
          <Button>New Workflow</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => {
          const href =
            option.value === "all" ? "/comm/workflows" : `/comm/workflows?status=${option.value}`;
          const active = statusFilter === option.value;
          return (
            <Link key={option.value} href={href}>
              <Button size="sm" variant={active ? "default" : "outline"}>
                {option.label}
              </Button>
            </Link>
          );
        })}
        <p className="text-xs text-muted-foreground">Showing: {selectedStatusLabel}</p>
      </div>

      <WorkflowsGeneratedListClient rows={listRows} capabilities={capabilities} />
    </div>
  );
}

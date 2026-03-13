"use client";

import { useRouter } from "next/navigation";
import { GeneratedList } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";

interface WorkflowsGeneratedListClientProps {
  rows: Record<string, unknown>[];
  capabilities: CapabilityResult;
}

export default function WorkflowsGeneratedListClient({
  rows,
  capabilities,
}: WorkflowsGeneratedListClientProps) {
  const router = useRouter();

  return (
    <GeneratedList
      entityKey="comm.workflow"
      capabilities={capabilities}
      data={rows}
      onRowAction={(actionKey, record) => {
        if (actionKey === "workflow.view") {
          const id = String(record.id ?? "");
          if (id) {
            router.push(`/comm/workflows/${id}`);
          }
        }
      }}
      keyboardNav
      onRowActivate={(record) => {
        const id = String(record.id ?? "");
        if (id) {
          router.push(`/comm/workflows/${id}`);
        }
      }}
      emptyState={{
        title: "No workflows found",
        description: "Create a workflow to automate communication flows.",
        actionLabel: "Create workflow",
        onAction: () => {
          router.push("/comm/workflows/new");
        },
      }}
    />
  );
}

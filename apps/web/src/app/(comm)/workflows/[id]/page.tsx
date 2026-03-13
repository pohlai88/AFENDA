"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@afenda/ui";
import {
  changeWorkflowStatus,
  deleteWorkflow,
  executeWorkflow,
  fetchWorkflow,
  fetchWorkflowRuns,
  updateWorkflow,
  type WorkflowRow,
  type WorkflowRunRow,
} from "@/lib/api-client";

interface WorkflowDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowRow | null>(null);
  const [runs, setRuns] = useState<WorkflowRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<
    "execute" | "pause" | "activate" | "save" | "delete" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    params.then((p) => setWorkflowId(p.id));
  }, [params]);

  useEffect(() => {
    if (!workflowId) return;
    const id = workflowId;

    async function load() {
      setLoading(true);
      try {
        const [workflowResponse, runsResponse] = await Promise.all([
          fetchWorkflow(id),
          fetchWorkflowRuns(id),
        ]);
        setWorkflow(workflowResponse.data);
        setEditName(workflowResponse.data.name);
        setEditDescription(workflowResponse.data.description ?? "");
        setRuns(runsResponse.data);
      } catch {
        setWorkflow(null);
        setRuns([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [workflowId]);

  async function runAction(action: "execute" | "pause" | "activate") {
    if (!workflow) return;
    setActionError(null);
    setBusyAction(action);

    try {
      if (action === "execute") {
        await executeWorkflow({
          idempotencyKey: crypto.randomUUID(),
          workflowId: workflow.id,
          triggerPayload: {
            source: "manual",
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        await changeWorkflowStatus({
          idempotencyKey: crypto.randomUUID(),
          workflowId: workflow.id,
          status: action === "pause" ? "paused" : "active",
        });
      }

      const [workflowResponse, runsResponse] = await Promise.all([
        fetchWorkflow(workflow.id),
        fetchWorkflowRuns(workflow.id),
      ]);
      setWorkflow(workflowResponse.data);
      setRuns(runsResponse.data);
    } catch (error) {
      setActionError(String(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveWorkflowBasics() {
    if (!workflow) return;
    setActionError(null);
    setBusyAction("save");

    try {
      await updateWorkflow({
        idempotencyKey: crypto.randomUUID(),
        workflowId: workflow.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      const workflowResponse = await fetchWorkflow(workflow.id);
      setWorkflow(workflowResponse.data);
      setEditName(workflowResponse.data.name);
      setEditDescription(workflowResponse.data.description ?? "");
    } catch (error) {
      setActionError(String(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function removeWorkflow() {
    if (!workflow) return;

    const confirmed = window.confirm(
      `Delete workflow \"${workflow.name}\"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setBusyAction("delete");
    try {
      await deleteWorkflow({
        idempotencyKey: crypto.randomUUID(),
        workflowId: workflow.id,
      });
      router.push("/comm/workflows");
    } catch (error) {
      setActionError(String(error));
      setBusyAction(null);
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted p-6" />;
  }

  if (!workflow) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Workflow not found</h1>
        <Button onClick={() => router.push("/comm/workflows")}>Back to workflows</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{workflow.name}</h1>
          <p className="text-sm text-muted-foreground">Trigger: {workflow.trigger.type}</p>
        </div>
        <span className="rounded bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground">
          {workflow.status}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-name">
              Name
            </Label>
            <Input
              id="workflow-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={busyAction !== null}
            />
          </div>
          <div className="space-y-2">
            <Label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="workflow-description"
            >
              Description
            </Label>
            <Textarea
              id="workflow-description"
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={busyAction !== null}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Actions configured: {workflow.actions.length} | Run count: {workflow.runCount}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={saveWorkflowBasics}
              disabled={busyAction !== null || editName.trim().length === 0}
            >
              {busyAction === "save" ? "Saving..." : "Save"}
            </Button>
            <Button onClick={() => runAction("execute")} disabled={busyAction !== null}>
              {busyAction === "execute" ? "Running..." : "Run now"}
            </Button>
            {workflow.status !== "paused" ? (
              <Button
                variant="outline"
                onClick={() => runAction("pause")}
                disabled={busyAction !== null}
              >
                {busyAction === "pause" ? "Pausing..." : "Pause"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => runAction("activate")}
                disabled={busyAction !== null}
              >
                {busyAction === "activate" ? "Activating..." : "Activate"}
              </Button>
            )}
            <Button variant="destructive" onClick={removeWorkflow} disabled={busyAction !== null}>
              {busyAction === "delete" ? "Deleting..." : "Delete"}
            </Button>
          </div>

          {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet</p>
          ) : (
            <div className="space-y-3">
              {runs.slice(0, 10).map((run) => (
                <div key={run.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{run.status}</span>
                    <span className="text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {run.error ? <p className="mt-2 text-destructive">{run.error}</p> : null}
                  <p className="mt-2 text-muted-foreground">
                    Executed actions: {run.executedActions.length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => router.push("/comm/workflows")}>
        Back to workflows
      </Button>
    </div>
  );
}

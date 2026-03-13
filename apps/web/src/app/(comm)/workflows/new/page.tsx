"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@afenda/ui";
import {
  WorkflowActionTypeValues,
  WorkflowTriggerTypeValues,
  type WorkflowActionType,
  type WorkflowTriggerType,
} from "@afenda/contracts";
import { createWorkflow } from "@/lib/api-client";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [configText, setConfigText] = useState('{"message":"Workflow action payload"}');
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    triggerType: WorkflowTriggerType;
    actionType: WorkflowActionType;
  }>({
    name: "",
    description: "",
    triggerType: WorkflowTriggerTypeValues[0],
    actionType: WorkflowActionTypeValues[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    let parsedConfig: Record<string, unknown>;
    try {
      const candidate = JSON.parse(configText) as unknown;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        setSubmitError("Action config must be a JSON object.");
        return;
      }
      parsedConfig = candidate as Record<string, unknown>;
    } catch {
      setSubmitError("Invalid JSON in action config.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createWorkflow({
        idempotencyKey: crypto.randomUUID(),
        name: formData.name,
        description: formData.description || undefined,
        trigger: { type: formData.triggerType },
        actions: [{ type: formData.actionType, config: parsedConfig }],
      });
      router.push(`/comm/workflows/${result.data.id}`);
    } catch (error) {
      setSubmitError(`Failed to create workflow: ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Create Workflow</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Workflow Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Invoice escalation workflow"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="What this workflow automates"
              />
            </div>

            <div>
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) =>
                  setFormData({ ...formData, triggerType: value as WorkflowTriggerType })
                }
              >
                <SelectTrigger id="triggerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WorkflowTriggerTypeValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actionType">Action Type</Label>
              <Select
                value={formData.actionType}
                onValueChange={(value) =>
                  setFormData({ ...formData, actionType: value as WorkflowActionType })
                }
              >
                <SelectTrigger id="actionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WorkflowActionTypeValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="config">Action Config (JSON object)</Label>
              <Textarea
                id="config"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/comm/workflows")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

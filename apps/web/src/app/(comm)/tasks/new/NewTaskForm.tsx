/**
 * New task form — create a new task.
 */

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@afenda/ui";
import { createTask } from "@/lib/api-client";

interface NewTaskFormProps {
  defaultProjectId?: string;
}

export default function NewTaskForm({ defaultProjectId }: NewTaskFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createTask({
        title: String(formData.get("title")),
        description: formData.get("description") ? String(formData.get("description")) : null,
        priority: formData.get("priority") ? String(formData.get("priority")) : undefined,
        projectId: formData.get("projectId") ? String(formData.get("projectId")) : null,
        dueDate: formData.get("dueDate") ? String(formData.get("dueDate")) : null,
        estimateMinutes: formData.get("estimateMinutes")
          ? parseInt(String(formData.get("estimateMinutes")))
          : null,
      });

      router.push(`/comm/tasks/${result.data.id}`);
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      {defaultProjectId ? <input type="hidden" name="projectId" value={defaultProjectId} /> : null}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Error creating task</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div>
        <Label htmlFor="title" className="block text-sm font-medium">
          Title *
        </Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          maxLength={500}
          className="mt-1"
          placeholder="Task title"
        />
      </div>

      <div>
        <Label htmlFor="description" className="block text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={20000}
          className="mt-1"
          placeholder="Task description"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority" className="block text-sm font-medium">
            Priority
          </Label>
          <Select name="priority">
            <SelectTrigger id="priority" className="mt-1 w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="dueDate" className="block text-sm font-medium">
            Due Date
          </Label>
          <Input id="dueDate" name="dueDate" type="date" className="mt-1" />
        </div>
      </div>

      <div>
        <Label htmlFor="estimateMinutes" className="block text-sm font-medium">
          Estimate (minutes)
        </Label>
        <Input
          id="estimateMinutes"
          name="estimateMinutes"
          type="number"
          min="0"
          className="mt-1"
          placeholder="0"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
}

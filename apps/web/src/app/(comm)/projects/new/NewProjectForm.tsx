"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { createProject } from "@/lib/api-client";

export default function NewProjectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState("team");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createProject({
          name: String(formData.get("name") ?? ""),
          description: formData.get("description") ? String(formData.get("description")) : null,
          visibility,
          startDate: formData.get("startDate") ? String(formData.get("startDate")) : null,
          targetDate: formData.get("targetDate") ? String(formData.get("targetDate")) : null,
          color: formData.get("color") ? String(formData.get("color")) : null,
        });

        router.push(`/comm/projects/${result.data.id}`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : String(submitError));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Error creating project</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={200}
          placeholder="Quarterly boardroom rollout"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={20000}
          rows={5}
          placeholder="Summarize scope, owners, and intended outcome."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger id="visibility" className="w-full">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org">Organization</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Project color</Label>
          <Input id="color" name="color" type="color" defaultValue="#0f766e" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">Target date</Label>
          <Input id="targetDate" name="targetDate" type="date" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create project"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/comm/projects")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

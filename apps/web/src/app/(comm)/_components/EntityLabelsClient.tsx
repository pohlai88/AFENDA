"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@afenda/ui";
import {
  assignLabel,
  createLabel,
  type CommCommentRow,
  type CommLabelRow,
  unassignLabel,
} from "@/lib/api-client";

interface EntityLabelsClientProps {
  entityType: CommCommentRow["entityType"];
  entityId: string;
  labels: CommLabelRow[];
  allLabels: CommLabelRow[];
  title?: string;
}

export default function EntityLabelsClient({
  entityType,
  entityId,
  labels,
  allLabels,
  title = "Labels",
}: EntityLabelsClientProps) {
  const router = useRouter();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const assigned = new Set(labels.map((label) => label.id));
    return allLabels.filter((label) => !assigned.has(label.id));
  }, [allLabels, labels]);

  const handleAssign = async (labelId: string) => {
    setError(null);
    setIsAssigning(true);
    try {
      await assignLabel({ labelId, entityType, entityId });
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (labelId: string) => {
    setError(null);
    setIsAssigning(true);
    try {
      await unassignLabel({ labelId, entityType, entityId });
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim();

    if (!name || !color) {
      setError("Name and color are required.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createLabel({ name, color });
      await assignLabel({ labelId: created.data.id, entityType, entityId });
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>

      {labels.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No labels assigned yet.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {labels.map((label) => (
            <li key={label.id}>
              <Badge
                variant="outline"
                className="inline-flex items-center gap-2"
                style={{ borderColor: label.color }}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 px-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    void handleUnassign(label.id);
                  }}
                  disabled={isAssigning}
                  aria-label={`Remove ${label.name}`}
                >
                  x
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {availableLabels.length > 0 ? (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Assign existing label</p>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label) => (
              <Button
                key={label.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={isAssigning}
                onClick={() => {
                  void handleAssign(label.id);
                }}
              >
                <span
                  aria-hidden="true"
                  className="mr-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          void handleCreate(event);
        }}
        className="mt-4 space-y-2 border-t pt-4"
      >
        <p className="text-xs font-medium text-muted-foreground">Create and assign label</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="labelName" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input id="labelName" name="name" maxLength={50} required placeholder="Urgent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labelColor" className="text-xs text-muted-foreground">
              Color
            </Label>
            <Input id="labelColor" name="color" type="color" defaultValue="#0f766e" />
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Button type="submit" size="sm" disabled={isCreating || isAssigning}>
          {isCreating ? "Creating..." : "Create Label"}
        </Button>
      </form>
    </div>
  );
}

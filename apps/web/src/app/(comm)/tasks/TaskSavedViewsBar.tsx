"use client";

import { useMemo, useState, useTransition } from "react";
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
  Switch,
} from "@afenda/ui";
import {
  deleteSavedView,
  saveView,
  updateSavedView,
  type CommSavedViewRow,
} from "@/lib/api-client";

interface TaskSavedViewsBarProps {
  savedViews: CommSavedViewRow[];
  activeViewId: string | null;
  currentFilters: {
    status?: string[];
    assigneeId?: string;
    projectId?: string;
    limit?: number;
  };
}

function toFilterPayload(
  filters: TaskSavedViewsBarProps["currentFilters"],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (filters.status && filters.status.length > 0) payload.status = filters.status;
  if (filters.assigneeId) payload.assigneeId = filters.assigneeId;
  if (filters.projectId) payload.projectId = filters.projectId;
  if (typeof filters.limit === "number") payload.limit = filters.limit;
  return payload;
}

export default function TaskSavedViewsBar({
  savedViews,
  activeViewId,
  currentFilters,
}: TaskSavedViewsBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isOrgShared, setIsOrgShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeView = useMemo(
    () => savedViews.find((view) => view.id === activeViewId) ?? null,
    [activeViewId, savedViews],
  );

  const handleSelectView = (viewId: string) => {
    if (viewId === "__none") {
      router.push("/comm/tasks");
      return;
    }

    router.push(`/comm/tasks?viewId=${encodeURIComponent(viewId)}`);
  };

  const handleSaveNew = () => {
    if (!name.trim()) {
      setError("View name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await saveView({
          entityType: "task",
          name: name.trim(),
          filters: toFilterPayload(currentFilters),
          sortBy: [],
          columns: [],
          isDefault,
          isOrgShared,
        });
        setName("");
        setIsDefault(false);
        setIsOrgShared(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : String(saveError));
      }
    });
  };

  const handleUpdateActive = () => {
    if (!activeView) {
      setError("Select a view first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updateSavedView({
          viewId: activeView.id,
          name: name.trim() ? name.trim() : undefined,
          filters: toFilterPayload(currentFilters),
          sortBy: activeView.sortBy,
          columns: activeView.columns,
          isDefault,
        });
        setName("");
        setIsDefault(false);
        router.refresh();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : String(updateError));
      }
    });
  };

  const handleDeleteActive = () => {
    if (!activeView) {
      setError("Select a view first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteSavedView({ viewId: activeView.id });
        router.push("/comm/tasks");
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
      }
    });
  };

  return (
    <section className="mb-6 rounded-lg border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          <Label htmlFor="task-saved-view">Saved views</Label>
          <Select value={activeViewId ?? "__none"} onValueChange={handleSelectView}>
            <SelectTrigger id="task-saved-view" className="w-full">
              <SelectValue placeholder="Choose saved view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No saved view</SelectItem>
              {savedViews.map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.name}
                  {view.isDefault ? " (default)" : ""}
                  {view.principalId ? "" : " (org)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder={activeView ? `Rename ${activeView.name}` : "Name current filters"}
              maxLength={100}
              disabled={isPending}
            />
            <Button type="button" variant="outline" onClick={handleSaveNew} disabled={isPending}>
              Save New
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUpdateActive}
              disabled={isPending || !activeView}
            >
              Update
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteActive}
              disabled={isPending || !activeView}
            >
              Delete
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Switch
                id="saved-view-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={isPending}
              />
              <Label htmlFor="saved-view-default">Set as default</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="saved-view-org"
                checked={isOrgShared}
                onCheckedChange={setIsOrgShared}
                disabled={isPending}
              />
              <Label htmlFor="saved-view-org">Org shared</Label>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
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
import type { ProjectMemberRow, ProjectMilestoneRow, ProjectRow } from "@/lib/api-client";
import {
  addProjectMember,
  archiveProject,
  completeProjectMilestone,
  createProjectMilestone,
  removeProjectMember,
  transitionProjectStatus,
  updateProject,
} from "@/lib/api-client";

interface ProjectSettingsClientProps {
  project: ProjectRow;
  members: ProjectMemberRow[];
  milestones: ProjectMilestoneRow[];
}

const PROJECT_VISIBILITY_OPTIONS = ["org", "team", "private"] as const;
const PROJECT_STATUS_TRANSITIONS = {
  planning: ["active", "on_hold", "cancelled", "archived"],
  active: ["on_hold", "completed", "cancelled", "archived"],
  on_hold: ["active", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
} as const;
const PROJECT_MEMBER_ROLES = ["owner", "editor", "viewer"] as const;

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "planned":
    case "on_track":
      return "secondary";
    case "at_risk":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function ProjectSettingsClient({
  project,
  members,
  milestones,
}: ProjectSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [milestoneSuccess, setMilestoneSuccess] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(project.visibility);
  const [memberRole, setMemberRole] = useState<(typeof PROJECT_MEMBER_ROLES)[number]>("viewer");
  const [nextStatus, setNextStatus] = useState<string>("");

  const allowedStatuses =
    PROJECT_STATUS_TRANSITIONS[project.status as keyof typeof PROJECT_STATUS_TRANSITIONS] ?? [];

  const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDetailsError(null);
    setDetailsSuccess(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateProject({
          projectId: project.id,
          name: String(formData.get("name") ?? ""),
          description: formData.get("description") ? String(formData.get("description")) : null,
          visibility,
          startDate: formData.get("startDate") ? String(formData.get("startDate")) : null,
          targetDate: formData.get("targetDate") ? String(formData.get("targetDate")) : null,
          color: formData.get("color") ? String(formData.get("color")) : null,
        });
        setDetailsSuccess("Project details updated.");
        router.refresh();
      } catch (error) {
        setDetailsError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleStatusSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nextStatus) return;
    setStatusError(null);
    setStatusSuccess(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await transitionProjectStatus({
          projectId: project.id,
          toStatus: nextStatus,
          reason: formData.get("reason") ? String(formData.get("reason")) : undefined,
        });
        setStatusSuccess(`Project moved to ${formatLabel(nextStatus)}.`);
        setNextStatus("");
        router.refresh();
      } catch (error) {
        setStatusError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleArchive = () => {
    setStatusError(null);
    setStatusSuccess(null);

    startTransition(async () => {
      try {
        await archiveProject({ projectId: project.id });
        setStatusSuccess("Project archived.");
        router.refresh();
      } catch (error) {
        setStatusError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError(null);
    setMemberSuccess(null);
    const formData = new FormData(event.currentTarget);
    const principalId = String(formData.get("principalId") ?? "").trim();
    if (!principalId) return;

    startTransition(async () => {
      try {
        await addProjectMember({ projectId: project.id, principalId, role: memberRole });
        setMemberSuccess("Project member added.");
        event.currentTarget.reset();
        setMemberRole("viewer");
        router.refresh();
      } catch (error) {
        setMemberError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleRemoveMember = (principalId: string) => {
    setMemberError(null);
    setMemberSuccess(null);

    startTransition(async () => {
      try {
        await removeProjectMember({ projectId: project.id, principalId });
        setMemberSuccess("Project member removed.");
        router.refresh();
      } catch (error) {
        setMemberError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleCreateMilestone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMilestoneError(null);
    setMilestoneSuccess(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createProjectMilestone({
          projectId: project.id,
          name: String(formData.get("name") ?? ""),
          description: formData.get("description")
            ? String(formData.get("description"))
            : undefined,
          targetDate: String(formData.get("targetDate") ?? ""),
        });
        setMilestoneSuccess("Milestone created.");
        event.currentTarget.reset();
        router.refresh();
      } catch (error) {
        setMilestoneError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const handleCompleteMilestone = (milestoneId: string) => {
    setMilestoneError(null);
    setMilestoneSuccess(null);

    startTransition(async () => {
      try {
        await completeProjectMilestone(milestoneId);
        setMilestoneSuccess("Milestone marked complete.");
        router.refresh();
      } catch (error) {
        setMilestoneError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              Update the project identity, visibility, and target dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              {detailsError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {detailsError}
                </div>
              ) : null}
              {detailsSuccess ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                  {detailsSuccess}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" defaultValue={project.name} required maxLength={200} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={project.description ?? ""}
                  rows={5}
                  maxLength={20000}
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
                      {PROJECT_VISIBILITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Project color</Label>
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={project.color ?? "#0f766e"}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={project.startDate ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target date</Label>
                  <Input
                    id="targetDate"
                    name="targetDate"
                    type="date"
                    defaultValue={project.targetDate ?? ""}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save details"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team access</CardTitle>
            <CardDescription>Add or remove project members by principal ID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {memberError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {memberError}
              </div>
            ) : null}
            {memberSuccess ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                {memberSuccess}
              </div>
            ) : null}

            <form
              onSubmit={handleAddMember}
              className="grid gap-4 md:grid-cols-[1fr_12rem_auto] md:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="principalId">Principal ID</Label>
                <Input
                  id="principalId"
                  name="principalId"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={memberRole}
                  onValueChange={(value) =>
                    setMemberRole(value as (typeof PROJECT_MEMBER_ROLES)[number])
                  }
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_MEMBER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isPending}>
                Add member
              </Button>
            </form>

            {members.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No project members have been added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{member.principalId}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined{" "}
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(member.joinedAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {formatLabel(member.role)}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRemoveMember(member.principalId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflow status</CardTitle>
            <CardDescription>
              Move the project through its allowed lifecycle transitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {statusError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {statusError}
              </div>
            ) : null}
            {statusSuccess ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                {statusSuccess}
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Current status</p>
              <p className="mt-1 text-lg font-semibold capitalize">{formatLabel(project.status)}</p>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nextStatus">Next status</Label>
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger id="nextStatus" className="w-full">
                    <SelectValue
                      placeholder={
                        allowedStatuses.length > 0
                          ? "Select next status"
                          : "No transitions available"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  maxLength={500}
                  placeholder="Optional context for the status change."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={isPending || !nextStatus || allowedStatuses.length === 0}
                >
                  Change status
                </Button>
                {project.status !== "archived" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={handleArchive}
                  >
                    Archive project
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              Create milestones and mark them complete as delivery progresses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {milestoneError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {milestoneError}
              </div>
            ) : null}
            {milestoneSuccess ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                {milestoneSuccess}
              </div>
            ) : null}

            <form onSubmit={handleCreateMilestone} className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="milestoneName">Milestone name</Label>
                <Input
                  id="milestoneName"
                  name="name"
                  required
                  maxLength={200}
                  placeholder="Pilot complete"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestoneDescription">Description</Label>
                <Textarea id="milestoneDescription" name="description" rows={3} maxLength={20000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestoneTargetDate">Target date</Label>
                <Input id="milestoneTargetDate" name="targetDate" type="date" required />
              </div>
              <Button type="submit" disabled={isPending}>
                Create milestone
              </Button>
            </form>

            {milestones.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No milestones have been defined yet.
              </div>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {milestone.milestoneNumber}
                        </p>
                        <h3 className="mt-1 font-semibold">{milestone.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {milestone.description ?? "No milestone description provided."}
                        </p>
                      </div>
                      <Badge variant={statusVariant(milestone.status)} className="capitalize">
                        {formatLabel(milestone.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Target {milestone.targetDate}</span>
                      {milestone.status !== "completed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleCompleteMilestone(milestone.id)}
                        >
                          Mark complete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

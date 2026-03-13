/**
 * Approval policies client — list + create-policy form.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@afenda/ui";
import type { ApprovalPolicyRow } from "@/lib/api-client";
import { fetchApprovalPolicies, createApprovalPolicy } from "@/lib/api-client";

interface ApprovalPoliciesClientProps {
  initialData: ApprovalPolicyRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

export default function ApprovalPoliciesClient({
  initialData,
  initialCursor,
  initialHasMore,
}: ApprovalPoliciesClientProps) {
  const router = useRouter();

  const [policies, setPolicies] = useState(initialData);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetchApprovalPolicies({ cursor, limit: 30 });
      setPolicies((prev) => [...prev, ...res.data]);
      setCursor(res.cursor ?? null);
      setHasMore(res.hasMore ?? false);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !entityType.trim() || !assigneeId.trim()) {
      setCreateError("Name, entity type, and at least one assignee are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await createApprovalPolicy({
        name,
        description: description || undefined,
        entityType,
        conditions: {},
        steps: [{ assigneeId }],
      });

      setName("");
      setDescription("");
      setEntityType("");
      setAssigneeId("");
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setCreateError(String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate((v) => !v)} variant="outline" size="sm">
          {showCreate ? "Cancel" : "+ New Policy"}
        </Button>
      </div>

      {/* Create policy form */}
      {showCreate && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-base font-semibold">New Approval Policy</h2>

          {createError && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="policy-name" className="block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="policy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="e.g. Invoice Approval"
              />
            </div>
            <div>
              <Label htmlFor="policy-entity-type" className="block text-sm font-medium">
                Entity Type <span className="text-destructive">*</span>
              </Label>
              <Input
                id="policy-entity-type"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="mt-1"
                placeholder="e.g. invoice"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="policy-description" className="block text-sm font-medium">
                Description
              </Label>
              <Input
                id="policy-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                placeholder="Optional description"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="policy-assignee" className="block text-sm font-medium">
                Step 1 Assignee (Principal ID) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="policy-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1"
                placeholder="UUID of the approver"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                void handleCreate();
              }}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Policy"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Policies table */}
      {policies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No approval policies yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Entity Type</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{policy.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{policy.entityType}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        policy.isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {policy.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(policy.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => {
              void loadMore();
            }}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

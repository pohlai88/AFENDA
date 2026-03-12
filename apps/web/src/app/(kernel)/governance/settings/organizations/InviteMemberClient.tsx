"use client";

import { useActionState, useState } from "react";
import {
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
} from "@afenda/ui";
import {
  listOrganizationsAction,
  inviteMemberAction,
  type OrganizationListItem,
  type InviteMemberResult,
} from "@/app/auth/_actions/create-organization";
import { UserPlus } from "lucide-react";

const INITIAL_STATE: InviteMemberResult = { ok: false, error: "" };

/**
 * Invite a member to an organization (Neon Auth auth.organization.inviteMember) — Settings > Organizations.
 */
export function InviteMemberClient() {
  const [organizations, setOrganizations] = useState<OrganizationListItem[] | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const [state, formAction, isPending] = useActionState(inviteMemberAction, INITIAL_STATE);

  async function handleLoadOrgs() {
    setLoadStatus("loading");
    const result = await listOrganizationsAction();
    if (result.ok) {
      setOrganizations(result.organizations);
      const first = result.organizations[0];
      if (first?.id && !selectedOrgId) setSelectedOrgId(first.id);
      setLoadStatus("idle");
    } else {
      setLoadStatus("error");
    }
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Invite member
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Invite someone to an organization by email. They will receive an invitation link.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite to organization
          </CardTitle>
          <CardDescription className="text-xs">
            Load your organizations, then choose one and enter the invitee&apos;s email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {organizations === null ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLoadOrgs}
              disabled={loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading…" : "Load organizations"}
            </Button>
          ) : (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="organizationId" value={selectedOrgId} readOnly />
              <div className="space-y-2">
                <Label htmlFor="invite-org">Organization</Label>
                <Select
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                  required
                  disabled={isPending}
                >
                  <SelectTrigger id="invite-org" className="w-full">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations
                      .filter((org): org is OrganizationListItem & { id: string } => Boolean(org.id))
                      .map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name ?? org.slug ?? org.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  placeholder="member@example.com"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role (optional)</Label>
                <Input
                  id="invite-role"
                  name="role"
                  type="text"
                  placeholder="member"
                  maxLength={64}
                  disabled={isPending}
                />
              </div>
              {state && !state.ok && state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {state?.ok && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Invitation sent successfully.
                </p>
              )}
              <Button type="submit" size="sm" disabled={isPending || !selectedOrgId}>
                {isPending ? "Sending…" : "Send invitation"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

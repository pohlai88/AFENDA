"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  Spinner,
  toast,
} from "@afenda/ui";
import { UserPlus } from "lucide-react";

import {
  inviteNeonClientOrganizationMember,
  neonClientCapabilities,
  useActiveOrganization,
} from "@/lib/auth/client";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

/**
 * Invite a member to an organization (Neon Auth auth.organization.inviteMember) — Settings > Organizations.
 */
export function InviteMemberClient({ onMutationSuccess }: { onMutationSuccess?: () => void }) {
  const canInviteMember = neonClientCapabilities.organization.inviteMember;

  const { data: activeOrganization } = useActiveOrganization();

  const [organizationId, setOrganizationId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (activeOrganization?.id) {
      setOrganizationId(activeOrganization.id);
    }
  }, [activeOrganization?.id]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canInviteMember) {
      setError("Organization invitations are unavailable in this environment.");
      return;
    }

    const normalizedOrgId = organizationId.trim();
    const normalizedEmail = email.trim();

    if (!normalizedOrgId) {
      setError("Organization ID is required.");
      return;
    }

    if (!normalizedEmail) {
      setError("Invitee email is required.");
      return;
    }

    startTransition(async () => {
      const response = await inviteNeonClientOrganizationMember({
        organizationId: normalizedOrgId,
        email: normalizedEmail,
        role,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to invite organization member."));
        return;
      }

      setSuccess(`Invitation sent to ${normalizedEmail}.`);
      setEmail("");
      toast.success("Invitation sent.");
      onMutationSuccess?.();
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Invite member</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Invite someone to an organization by email. They will receive an invitation link.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" />
            Invite to organization
          </CardTitle>
          <CardDescription className="text-xs">
            Invite a teammate by email and assign their initial organization role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canInviteMember ? (
            <Alert>
              <AlertTitle>Invitations unavailable</AlertTitle>
              <AlertDescription>
                Neon organization.inviteMember is not available in this environment.
              </AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertTitle>Invitation sent</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to send invitation</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="organization-invite-org-id">Organization ID</Label>
              <Input
                id="organization-invite-org-id"
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                placeholder="org_..."
                disabled={!canInviteMember || isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="organization-invite-email">Email</Label>
              <Input
                id="organization-invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                disabled={!canInviteMember || isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="organization-invite-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger
                  id="organization-invite-role"
                  disabled={!canInviteMember || isPending}
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" disabled={!canInviteMember || isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Sending...
                </span>
              ) : (
                "Send invitation"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

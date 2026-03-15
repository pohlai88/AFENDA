"use client";

import { useState, useTransition } from "react";
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
  Spinner,
  toast,
} from "@afenda/ui";
import { Building2 } from "lucide-react";

import { createNeonClientOrganization, neonClientCapabilities } from "@/lib/auth/client";

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
 * Create organization (Neon Auth auth.organization.create) — Settings > Organizations.
 */
export function CreateOrganizationClient({
  onMutationSuccess,
}: {
  onMutationSuccess?: () => void;
}) {
  const canCreateOrganization = neonClientCapabilities.organization.create;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canCreateOrganization) {
      setError("Organization creation is unavailable in this environment.");
      return;
    }

    const normalizedName = name.trim();
    const normalizedSlug = slug.trim();

    if (!normalizedName) {
      setError("Organization name is required.");
      return;
    }

    startTransition(async () => {
      const response = await createNeonClientOrganization({
        name: normalizedName,
        slug: normalizedSlug || undefined,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to create organization."));
        return;
      }

      setSuccess(`Organization \"${normalizedName}\" created.`);
      setName("");
      setSlug("");
      toast.success("Organization created.");
      onMutationSuccess?.();
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Create organization</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Add a new organization. You will be able to switch to it from the workspace selector.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" />
            New organization
          </CardTitle>
          <CardDescription className="text-xs">
            Create a new Neon organization for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canCreateOrganization ? (
            <Alert>
              <AlertTitle>Organization creation unavailable</AlertTitle>
              <AlertDescription>
                Neon organization.create is not available in this environment.
              </AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertTitle>Organization created</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to create organization</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="organization-create-name">Organization name</Label>
              <Input
                id="organization-create-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Holdings"
                disabled={!canCreateOrganization || isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="organization-create-slug">Slug (optional)</Label>
              <Input
                id="organization-create-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="acme-holdings"
                disabled={!canCreateOrganization || isPending}
              />
            </div>

            <Button type="submit" size="sm" disabled={!canCreateOrganization || isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Creating...
                </span>
              ) : (
                "Create organization"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

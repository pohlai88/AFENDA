"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@afenda/ui";
import { createOrganizationAction, type CreateOrganizationResult } from "@/app/auth/_actions/create-organization";
import { Building2 } from "lucide-react";

const INITIAL_STATE: CreateOrganizationResult = { ok: false, error: "" };

/**
 * Create organization (Neon Auth auth.organization.create) — Settings > Organizations.
 */
export function CreateOrganizationClient() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createOrganizationAction, INITIAL_STATE);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Create organization
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Add a new organization. You will be able to switch to it from the workspace selector.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            New organization
          </CardTitle>
          <CardDescription className="text-xs">
            Name is required. Slug is optional and used in URLs (e.g. my-org).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="create-org-name">Name</Label>
              <Input
                id="create-org-name"
                name="name"
                type="text"
                placeholder="My Organization"
                required
                maxLength={160}
                disabled={isPending}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-org-slug">Slug (optional)</Label>
              <Input
                id="create-org-slug"
                name="slug"
                type="text"
                placeholder="my-org"
                maxLength={64}
                disabled={isPending}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            {state && !state.ok && state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state?.ok && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Organization created successfully.
                {state.data?.name && ` "${state.data.name}"`}
              </p>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

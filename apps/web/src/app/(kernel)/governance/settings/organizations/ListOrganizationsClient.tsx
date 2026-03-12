"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import { listOrganizationsAction, type OrganizationListItem } from "@/app/auth/_actions/create-organization";
import { Building2 } from "lucide-react";

/**
 * List current user's organizations (Neon Auth auth.organization.list) — Settings > Organizations.
 */
export function ListOrganizationsClient() {
  const [organizations, setOrganizations] = useState<OrganizationListItem[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    setStatus("loading");
    setError(null);
    const result = await listOrganizationsAction();
    if (result.ok) {
      setOrganizations(result.organizations);
      setStatus("idle");
    } else {
      setError(result.error);
      setOrganizations(null);
      setStatus("error");
    }
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Your organizations
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Organizations you belong to. Switch between them from the workspace selector.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </CardTitle>
          <CardDescription className="text-xs">
            Load the list of organizations for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoad}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Loading…" : "Load organizations"}
          </Button>
          {organizations !== null && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              {organizations.length === 0 ? (
                <p className="text-muted-foreground">No organizations found.</p>
              ) : (
                <ul className="space-y-2">
                  {organizations.map((org, i) => (
                    <li key={org.id ?? i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium text-foreground">{org.name ?? "—"}</span>
                      {org.slug && (
                        <span className="font-mono text-muted-foreground">{org.slug}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

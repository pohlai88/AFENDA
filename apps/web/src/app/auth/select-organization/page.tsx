import { redirect } from "next/navigation";

import { auth } from "@/auth";
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
} from "@afenda/ui";

import { selectOrganizationAction } from "../_actions/tenant-context";
import {
  listOrganizationsForCurrentUser,
  resolvePostSelectionCallback,
  setActiveOrganization,
} from "@/lib/auth/tenant-context";

interface SelectOrganizationPageProps {
  searchParams: Promise<{
    callback?: string;
    error?: string;
  }>;
}

export default async function SelectOrganizationPage({
  searchParams,
}: SelectOrganizationPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?next=/auth/select-organization");
  }

  const params = await searchParams;
  const callback = resolvePostSelectionCallback(params.callback);
  const organizations = await listOrganizationsForCurrentUser();

  if (organizations.length === 1) {
    await setActiveOrganization(organizations[0]!.id);
    redirect(callback);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
          <CardDescription>
            Choose the organization you want to use for this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {params.error ? (
            <Alert variant="destructive">
              <AlertTitle>Organization selection failed</AlertTitle>
              <AlertDescription>Please choose an organization you can access.</AlertDescription>
            </Alert>
          ) : null}

          {organizations.length === 0 ? (
            <div className="space-y-3 rounded-md border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                No data is available for organizations on this account yet.
              </p>
              <Button asChild className="w-full">
                <a href="/auth/onboarding">Create or join an organization</a>
              </Button>
            </div>
          ) : (
            organizations.map((organization) => (
              <form action={selectOrganizationAction} key={organization.id}>
                <Input type="hidden" name="organizationId" value={organization.id} readOnly />
                <Input type="hidden" name="callback" value={callback} readOnly />
                <Button className="w-full justify-start" type="submit" variant="outline">
                  <span className="truncate">{organization.name}</span>
                  {organization.slug ? (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {organization.slug}
                    </span>
                  ) : null}
                </Button>
              </form>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}

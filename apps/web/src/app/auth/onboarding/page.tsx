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
  Label,
} from "@afenda/ui";

import { createOrganizationAndActivateAction } from "../_actions/tenant-context";

interface OnboardingPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?next=/auth/onboarding");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set Up Your Organization</CardTitle>
          <CardDescription>
            Your account is signed in, but no organization context is active yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to complete onboarding</AlertTitle>
              <AlertDescription>
                Please check your inputs and try again.
              </AlertDescription>
            </Alert>
          ) : null}

          <form action={createOrganizationAndActivateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" name="name" placeholder="Acme Holdings" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Organization slug (optional)</Label>
              <Input id="slug" name="slug" placeholder="acme" />
            </div>

            <Button type="submit" className="w-full">
              Create organization and continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

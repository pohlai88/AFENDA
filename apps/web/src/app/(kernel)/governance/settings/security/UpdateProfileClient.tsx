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
} from "@afenda/ui";
import { UserCog } from "lucide-react";

import { updateProfileAction } from "./actions";

/**
 * Profile update panel backed by a server action to keep mutation ownership server-side.
 */
export function UpdateProfileClient({
  defaultName,
  defaultImage,
}: {
  defaultName?: string | null;
  defaultImage?: string | null;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [image, setImage] = useState(defaultImage ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await updateProfileAction({ name, image });
        setSuccess("Profile updated.");
      } catch (submitError) {
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : "Unable to update profile.";
        setError(message);
      }
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Profile</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Update your profile identity fields used across governance and approval records.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <UserCog className="h-4 w-4" />
            Update profile
          </CardTitle>
          <CardDescription className="text-xs">
            Persist display identity through server-owned mutation flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <Alert>
              <AlertTitle>Profile updated</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="security-profile-name">Display name</Label>
              <Input
                id="security-profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Tan"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="security-profile-image">Avatar URL</Label>
              <Input
                id="security-profile-image"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://example.com/avatar.png"
                disabled={isPending}
              />
            </div>

            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Saving...
                </span>
              ) : (
                "Save profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

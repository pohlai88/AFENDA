"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@afenda/ui";
import { addBoardAttendee } from "@/lib/api-client";

interface AddAttendeeFormProps {
  meetingId: string;
}

export function AddAttendeeForm({ meetingId }: AddAttendeeFormProps) {
  const router = useRouter();
  const [principalId, setPrincipalId] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await addBoardAttendee({
        meetingId,
        principalId: principalId.trim(),
        role: role.trim() || null,
      });
      router.push(`/comm/boardroom/${meetingId}`);
      router.refresh();
    } catch (submitError) {
      setError(`Failed to add attendee: ${String(submitError)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New attendee</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="principalId">Principal ID (UUID)</Label>
            <Input
              id="principalId"
              value={principalId}
              onChange={(e) => setPrincipalId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              required
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="role">Role (optional)</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. member, observer"
              maxLength={64}
              className="mt-1"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add attendee"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

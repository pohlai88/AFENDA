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
  Textarea,
} from "@afenda/ui";
import { createBoardMeeting } from "@/lib/api-client";

interface NewMeetingFormProps {
  defaultChairId: string;
}

export default function NewMeetingForm({ defaultChairId }: NewMeetingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chairId, setChairId] = useState(defaultChairId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createBoardMeeting({
        title,
        description: description.trim() || undefined,
        chairId: chairId.trim(),
      });
      if (result.data.id) {
        router.push(`/comm/boardroom/${result.data.id}`);
      }
    } catch (submitError) {
      setError(`Failed to create meeting: ${String(submitError)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Schedule Meeting</h1>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>New board meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="chairId">Chair</Label>
              <Input
                id="chairId"
                required
                value={chairId}
                onChange={(e) => setChairId(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Defaults to you. In a full implementation, this would be a user picker.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/comm/boardroom")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { addBoardAgendaItem } from "@/lib/api-client";

interface AddAgendaItemFormProps {
  meetingId: string;
}

export function AddAgendaItemForm({ meetingId }: AddAgendaItemFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await addBoardAgendaItem({
        meetingId,
        title: title.trim(),
        description: description.trim() || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      });
      router.push(`/comm/boardroom/${meetingId}`);
      router.refresh();
    } catch (submitError) {
      setError(`Failed to add agenda item: ${String(submitError)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New agenda item</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Agenda item title"
              required
              maxLength={500}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes or context"
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="durationMinutes">Duration (minutes, optional)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={0}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 15"
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
              {isSubmitting ? "Adding…" : "Add item"}
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

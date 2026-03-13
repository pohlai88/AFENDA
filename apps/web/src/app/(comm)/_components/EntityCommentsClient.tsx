"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Textarea } from "@afenda/ui";
import { addComment, type CommCommentRow } from "@/lib/api-client";

interface EntityCommentsClientProps {
  entityType: CommCommentRow["entityType"];
  entityId: string;
  comments: CommCommentRow[];
  title?: string;
}

export default function EntityCommentsClient({
  entityType,
  entityId,
  comments,
  title = "Comments",
}: EntityCommentsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("commentBody") ?? "").trim();

    if (!body) {
      setError("Comment body is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        entityType,
        entityId,
        body,
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>

      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap">{comment.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="mt-4 space-y-2 border-t pt-4"
      >
        <Label htmlFor="commentBody" className="text-xs text-muted-foreground">
          Add comment
        </Label>
        <Textarea
          id="commentBody"
          name="commentBody"
          rows={3}
          maxLength={20000}
          required
          placeholder="Share an update or decision..."
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </form>
    </div>
  );
}

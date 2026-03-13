"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Textarea } from "@afenda/ui";
import { postChatterMessage, type CommChatterMessageRow } from "@/lib/api-client";

interface EntityChatterClientProps {
  entityType: CommChatterMessageRow["entityType"];
  entityId: string;
  messages: CommChatterMessageRow[];
  title?: string;
}

export default function EntityChatterClient({
  entityType,
  entityId,
  messages,
  title = "Chatter",
}: EntityChatterClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("messageBody") ?? "").trim();

    if (!body) {
      setError("Message body is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await postChatterMessage({
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

      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No chatter messages yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-md bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString()}
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
        <Label htmlFor="messageBody" className="text-xs text-muted-foreground">
          Post to thread
        </Label>
        <Textarea
          id="messageBody"
          name="messageBody"
          rows={3}
          maxLength={20000}
          required
          placeholder="Share an update, decision, or question..."
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Message"}
        </Button>
      </form>
    </div>
  );
}

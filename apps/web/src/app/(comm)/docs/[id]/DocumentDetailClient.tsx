"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import {
  archiveCommDocument,
  publishCommDocument,
  subscribeEntity,
  unsubscribeEntity,
  type CommChatterMessageRow,
  type CommDocumentRow,
  type CommLabelRow,
  type CommSubscriptionRow,
} from "@/lib/api-client";
import EntityChatterClient from "../../_components/EntityChatterClient";
import EntityLabelsClient from "../../_components/EntityLabelsClient";

interface DocumentDetailClientProps {
  document: CommDocumentRow;
  chatterMessages: CommChatterMessageRow[];
  labels: CommLabelRow[];
  allLabels: CommLabelRow[];
  subscriptions: CommSubscriptionRow[];
  children: CommDocumentRow[];
  breadcrumb: CommDocumentRow[];
  currentPrincipalId: string | null;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export default function DocumentDetailClient({
  document,
  chatterMessages,
  labels,
  allLabels,
  subscriptions,
  children,
  breadcrumb,
  currentPrincipalId,
}: DocumentDetailClientProps) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubscribed =
    Boolean(currentPrincipalId) &&
    subscriptions.some((sub) => sub.principalId === currentPrincipalId);

  async function onPublish() {
    setError(null);
    setIsMutating(true);
    try {
      await publishCommDocument({ documentId: document.id });
      router.refresh();
    } catch (publishError) {
      setError(`Failed to publish: ${String(publishError)}`);
    } finally {
      setIsMutating(false);
    }
  }

  async function onArchive() {
    setError(null);
    setIsMutating(true);
    try {
      await archiveCommDocument({ documentId: document.id });
      router.refresh();
    } catch (archiveError) {
      setError(`Failed to archive: ${String(archiveError)}`);
    } finally {
      setIsMutating(false);
    }
  }

  async function onToggleWatch() {
    setError(null);
    setIsUpdatingSubscription(true);
    try {
      if (isSubscribed) {
        await unsubscribeEntity({ entityType: "document", entityId: document.id });
      } else {
        await subscribeEntity({ entityType: "document", entityId: document.id });
      }
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsUpdatingSubscription(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {breadcrumb.length > 1 ? (
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/comm/docs" className="hover:text-foreground">
            Docs
          </Link>
          {breadcrumb.slice(0, -1).map((doc) => (
            <span key={doc.id} className="flex items-center gap-2">
              <span>/</span>
              <Link href={`/comm/docs/${doc.id}`} className="hover:text-foreground">
                {doc.title}
              </Link>
            </span>
          ))}
          <span className="text-foreground">/ {document.title}</span>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {document.documentNumber}: {document.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updated {new Date(document.updatedAt).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={document.status === "published" ? "default" : "secondary"}>
              {formatLabel(document.status)}
            </Badge>
            <Badge variant="outline">{formatLabel(document.documentType)}</Badge>
            <Badge variant="outline">{formatLabel(document.visibility)}</Badge>
            {document.slug ? (
              <Badge variant="outline" className="font-mono text-xs">
                /{document.slug}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/comm/docs/${document.id}/history`}>History</Link>
          </Button>
          {currentPrincipalId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onToggleWatch()}
              disabled={isUpdatingSubscription}
            >
              {isSubscribed ? "Unwatch" : "Watch"}
            </Button>
          ) : null}
          {document.status === "draft" ? (
            <Button onClick={() => void onPublish()} disabled={isMutating}>
              {isMutating ? "Publishing..." : "Publish"}
            </Button>
          ) : null}
          {document.status !== "archived" ? (
            <Button onClick={() => void onArchive()} disabled={isMutating} variant="outline">
              {isMutating ? "Archiving..." : "Archive"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="whitespace-pre-wrap text-sm leading-6">{document.body}</article>
        </CardContent>
      </Card>

      {children.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Child documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/comm/docs/${child.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {child.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatLabel(child.status)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <EntityLabelsClient
          entityType="document"
          entityId={document.id}
          labels={labels}
          allLabels={allLabels}
          title="Labels"
        />
        <EntityChatterClient
          entityType="document"
          entityId={document.id}
          messages={chatterMessages}
          title="Chatter"
        />
      </div>
    </div>
  );
}

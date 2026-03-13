"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchCommDocumentHistory, type CommDocumentVersionRow } from "@/lib/api-client";

export default function DocumentHistoryPage() {
  const params = useParams<{ id: string }>();
  const documentId = params?.id;

  const [versions, setVersions] = useState<CommDocumentVersionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;

    let disposed = false;
    async function load() {
      try {
        const result = await fetchCommDocumentHistory(documentId);
        if (!disposed) setVersions(result.data.data);
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, [documentId]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Document History</h1>
        {documentId ? (
          <Button asChild variant="outline">
            <Link href={`/comm/docs/${documentId}`}>Back to document</Link>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading history...</p>
      ) : versions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No versions recorded.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <CardTitle>Version {version.versionNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Recorded {new Date(version.createdAt).toLocaleString()}
                </p>
                <p className="font-medium">{version.title}</p>
                <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">
                  {version.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

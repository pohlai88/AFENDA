"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchCommDocuments, type CommDocumentRow } from "@/lib/api-client";

export default function DocsPage() {
  const [docs, setDocs] = useState<CommDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const result = await fetchCommDocuments({ limit: 50 });
        if (!disposed) {
          setDocs(result.data);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Docs</h1>
          <p className="text-muted-foreground">
            Shared operational knowledge and policy documents.
          </p>
        </div>
        <Button asChild>
          <Link href="/comm/docs/new">New document</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading docs...</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No documents yet. Create your first document.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <Link className="hover:underline" href={`/comm/docs/${doc.id}`}>
                    {doc.documentNumber}: {doc.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={doc.status === "published" ? "default" : "secondary"}>
                      {doc.status}
                    </Badge>
                    <Badge variant="outline">{doc.documentType.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">{doc.visibility.replace(/_/g, " ")}</Badge>
                    {doc.slug ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        /{doc.slug}
                      </Badge>
                    ) : null}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">{doc.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

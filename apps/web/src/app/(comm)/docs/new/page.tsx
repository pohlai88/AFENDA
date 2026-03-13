"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@afenda/ui";
import { createCommDocument, fetchCommDocuments, type CommDocumentRow } from "@/lib/api-client";

const DOCUMENT_TYPES = ["page", "wiki", "sop", "template", "policy"] as const;
const VISIBILITIES = ["org", "team", "private"] as const;

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [documentType, setDocumentType] = useState<"page" | "wiki" | "sop" | "template" | "policy">("page");
  const [visibility, setVisibility] = useState<"org" | "team" | "private">("org");
  const [slug, setSlug] = useState("");
  const [parentDocId, setParentDocId] = useState<string | null>(null);
  const [rootDocs, setRootDocs] = useState<CommDocumentRow[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    fetchCommDocuments({ limit: 100 })
      .then((res) => {
        if (!disposed) {
          const roots = res.data.filter((d) => !d.parentDocId);
          setRootDocs(roots);
        }
      })
      .finally(() => {
        if (!disposed) setLoadingParents(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createCommDocument({
        title,
        body,
        documentType,
        visibility,
        slug: slug.trim() || undefined,
        parentDocId: parentDocId ?? undefined,
      });
      router.push(`/comm/docs/${result.data.id}`);
    } catch (submitError) {
      setError(`Failed to create document: ${String(submitError)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Create Document</h1>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>New document</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="documentType">Type</Label>
                <Select
                  value={documentType}
                  onValueChange={(v) => setDocumentType(v as typeof documentType)}
                >
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as typeof visibility)}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {formatLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input
                id="slug"
                placeholder="my-document"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                URL-friendly identifier. Must be unique per org. Leave empty to auto-generate.
              </p>
            </div>
            <div>
              <Label htmlFor="parentDocId">Parent document (optional)</Label>
              <Select
                value={parentDocId ?? "none"}
                onValueChange={(v) => setParentDocId(v === "none" ? null : v)}
                disabled={loadingParents}
              >
                <SelectTrigger id="parentDocId">
                  <SelectValue placeholder="None (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root)</SelectItem>
                  {rootDocs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingParents && rootDocs.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No parent documents yet. This will be a root document.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                required
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/comm/docs")}
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

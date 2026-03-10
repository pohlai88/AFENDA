import { fetchDocuments } from "@/lib/api-client";
import { EvidenceDocumentsClient } from "./EvidenceDocumentsClient";

export const dynamic = "force-dynamic";

/** Evidence documents — uploaded files and metadata. */
export default async function EvidenceDocumentsPage() {
  const { data, cursor, hasMore } = await fetchDocuments({ limit: 20 });

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Documents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Evidence and document management. Upload via presign → register flow.
        </p>
      </div>
      <EvidenceDocumentsClient
        initialData={data}
        initialCursor={cursor}
        initialHasMore={hasMore}
      />
    </div>
  );
}

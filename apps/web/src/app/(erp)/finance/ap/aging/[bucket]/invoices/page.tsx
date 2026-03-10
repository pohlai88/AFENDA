import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchInvoicesByAgingBucket } from "@/lib/api-client";
import { AgingBucketInvoicesClient } from "./AgingBucketInvoicesClient";

const BUCKET_LABELS: Record<string, string> = {
  current: "Current (0–30 days)",
  "1-30": "1–30 days overdue",
  "31-60": "31–60 days overdue",
  "61-90": "61–90 days overdue",
  "90+": "90+ days overdue",
};

interface PageProps {
  params: Promise<{ bucket: string }>;
}

export default async function AgingBucketInvoicesPage({ params }: PageProps) {
  const { bucket } = await params;
  const validBucket = ["current", "1-30", "31-60", "61-90", "90+"].includes(
    bucket,
  )
    ? (bucket as "current" | "1-30" | "31-60" | "61-90" | "90+")
    : "current";

  const res = await fetchInvoicesByAgingBucket(validBucket);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/ap/aging">← Back to aging</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Invoices — {BUCKET_LABELS[validBucket] ?? validBucket}
      </h1>
      <AgingBucketInvoicesClient
        initialInvoices={res.data.invoices}
        bucket={validBucket}
      />
    </div>
  );
}

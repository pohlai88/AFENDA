"use client";

/**
 * Client wrapper for invoice detail page.
 * Provides RecordWorkspace with toolbar handlers (Print, Export, Duplicate, Share).
 * Sets sidecar content so CrudSapRail Audit/Evidence actions open the sidecar.
 */
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecordWorkspace, toast, useSidecarContent } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import type { InvoiceRow } from "@/lib/api-client";
import { exportSingleRecord } from "@/lib/export-utils";
import InvoiceDetailClient from "./InvoiceDetailClient";

interface InvoiceDetailPageClientProps {
  invoice: InvoiceRow;
  capabilities: CapabilityResult;
  breadcrumbs: { label: string; href?: string }[];
}

export default function InvoiceDetailPageClient({
  invoice,
  capabilities,
  breadcrumbs,
}: InvoiceDetailPageClientProps) {
  const router = useRouter();
  const { setSidecarContent, clearSidecarContent } = useSidecarContent();

  useEffect(() => {
    setSidecarContent();
    return () => clearSidecarContent();
  }, [setSidecarContent, clearSidecarContent]);

  const handlePrint = useCallback(() => {
    window.open(`/finance/ap/invoices/${invoice.id}/print`, "_blank", "noopener,noreferrer");
  }, [invoice.id]);

  const handleExport = useCallback(
    async (format: "csv" | "xlsx" | "pdf") => {
      try {
        await exportSingleRecord(
          invoice as unknown as Record<string, unknown>,
          "finance.ap_invoice",
          format,
        );
        toast.success(`${format.toUpperCase()} exported`);
      } catch {
        toast.error("Export failed");
      }
    },
    [invoice],
  );

  const handleDuplicate = useCallback(() => {
    // Navigate to new invoice form with copied data as query/state
    const params = new URLSearchParams();
    params.set("clone", invoice.id);
    router.push(`/finance/ap/invoices/new?${params.toString()}`);
  }, [invoice.id, router]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/finance/ap/invoices/${invoice.id}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }, [invoice.id]);

  return (
    <RecordWorkspace>
      <InvoiceDetailClient invoice={invoice} capabilities={capabilities} />
    </RecordWorkspace>
  );
}

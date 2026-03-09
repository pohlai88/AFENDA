import { notFound } from "next/navigation";
import { fetchInvoice, fetchCapabilities } from "@/lib/api-client";
import InvoiceDetailPageClient from "./InvoiceDetailPageClient";

/** AP Invoice detail — server-fetched data, RecordWorkspace + client interactivity. */
export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoiceRes;
  let capabilitiesRes;
  try {
    [invoiceRes, capabilitiesRes] = await Promise.all([
      fetchInvoice(id),
      fetchCapabilities("finance.ap_invoice"),
    ]);
  } catch {
    notFound();
  }

  const invoice = invoiceRes.data;
  const capabilities = capabilitiesRes.data;

  const breadcrumbs = [
    { label: "Finance", href: "/finance" },
    { label: "AP Invoices", href: "/finance/ap/invoices" },
    { label: `Invoice ${invoice.invoiceNumber}` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <InvoiceDetailPageClient
        invoice={invoice}
        capabilities={capabilities}
        breadcrumbs={breadcrumbs}
      />
    </div>
  );
}

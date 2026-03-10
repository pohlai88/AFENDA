import { fetchCapabilities } from "@/lib/api-client";
import NewInvoiceClient from "./NewInvoiceClient";

/** New Invoice — create draft invoice form. */
export default async function NewInvoicePage() {
  const capabilitiesRes = await fetchCapabilities("finance.ap_invoice");

  return <NewInvoiceClient capabilities={capabilitiesRes.data} />;
}

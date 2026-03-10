import { WhtCertificateListClient } from "./WhtCertificateListClient";

/** WHT Certificates — withholding tax certificates for suppliers */
export default async function WhtCertificatesPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">WHT Certificates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Withholding tax certificates for supplier payments
        </p>
      </div>
      <WhtCertificateListClient />
    </div>
  );
}

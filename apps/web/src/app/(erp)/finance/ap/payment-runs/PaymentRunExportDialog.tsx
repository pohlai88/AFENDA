"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@afenda/ui";
import { exportPaymentRunFile } from "@/lib/api-client";
import { toast } from "@afenda/ui";

type Format = "ISO20022" | "NACHA";

interface PaymentRunExportDialogProps {
  paymentRunId: string;
  runNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentRunExportDialog({
  paymentRunId,
  runNumber,
  open,
  onOpenChange,
}: PaymentRunExportDialogProps) {
  const [format, setFormat] = useState<Format>("ISO20022");
  const [loading, setLoading] = useState(false);

  // ISO 20022 fields
  const [debtorName, setDebtorName] = useState("");
  const [debtorIban, setDebtorIban] = useState("");
  const [debtorBic, setDebtorBic] = useState("");
  const [debtorCurrency, setDebtorCurrency] = useState("EUR");

  // NACHA fields
  const [immediateDest, setImmediateDest] = useState("");
  const [immediateOrigin, setImmediateOrigin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyEntryDescription, setCompanyEntryDescription] =
    useState("SUPPLIER");

  async function handleExport() {
    setLoading(true);
    try {
      const params =
        format === "ISO20022"
          ? {
              format: "ISO20022" as const,
              debtorName,
              debtorIban,
              debtorBic: debtorBic || undefined,
              debtorCurrency,
            }
          : {
              format: "NACHA" as const,
              immediateDest,
              immediateOrigin,
              companyName,
              companyId,
              companyEntryDescription: companyEntryDescription || undefined,
            };

      const { blob, fileName } = await exportPaymentRunFile(
        paymentRunId,
        params,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Payment file downloaded", {
        description: fileName,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const canExport =
    format === "ISO20022"
      ? debtorName.trim() && debtorIban.trim() && debtorCurrency.trim()
      : immediateDest.trim() &&
        immediateOrigin.trim() &&
        companyName.trim() &&
        companyId.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export payment run {runNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ISO20022">ISO 20022 (SEPA/SWIFT)</SelectItem>
                <SelectItem value="NACHA">NACHA ACH (US domestic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === "ISO20022" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debtorName">Account holder name</Label>
                <Input
                  id="debtorName"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtorIban">IBAN</Label>
                <Input
                  id="debtorIban"
                  value={debtorIban}
                  onChange={(e) => setDebtorIban(e.target.value)}
                  placeholder="DE89370400440532013000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtorBic">BIC/SWIFT (optional)</Label>
                <Input
                  id="debtorBic"
                  value={debtorBic}
                  onChange={(e) => setDebtorBic(e.target.value)}
                  placeholder="COBADEFFXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtorCurrency">Currency</Label>
                <Input
                  id="debtorCurrency"
                  value={debtorCurrency}
                  onChange={(e) => setDebtorCurrency(e.target.value)}
                  placeholder="EUR"
                  maxLength={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="immediateDest">Immediate destination (9 digits)</Label>
                <Input
                  id="immediateDest"
                  value={immediateDest}
                  onChange={(e) => setImmediateDest(e.target.value)}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="immediateOrigin">Immediate origin (10 chars)</Label>
                <Input
                  id="immediateOrigin"
                  value={immediateOrigin}
                  onChange={(e) => setImmediateOrigin(e.target.value)}
                  placeholder="1234567890"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Inc"
                  maxLength={23}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID (tax ID, 10 chars)</Label>
                <Input
                  id="companyId"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="1234567890"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEntryDescription">Entry description (optional)</Label>
                <Input
                  id="companyEntryDescription"
                  value={companyEntryDescription}
                  onChange={(e) => setCompanyEntryDescription(e.target.value)}
                  placeholder="SUPPLIER"
                  maxLength={10}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!canExport || loading}>
            {loading ? "Exporting…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

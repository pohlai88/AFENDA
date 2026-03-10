"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Card,
  CardContent,
} from "@afenda/ui";
import { formatCurrency } from "@/lib/format";
import { fetchWhtCertificates } from "@/lib/api-client";

interface WhtCertificate {
  id: string;
  supplierId: string;
  certificateNumber: string;
  whtType: string;
  jurisdictionCode: string;
  currencyCode: string;
  grossAmountMinor: string;
  whtRatePercent: string;
  whtAmountMinor: string;
  netAmountMinor: string;
  taxPeriod: string;
  certificateDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function WhtCertificateListClient() {
  const [certs, setCerts] = useState<WhtCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWhtCertificates()
      .then((res) => setCerts(res.data || []))
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, []);

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      DRAFT: "outline",
      ISSUED: "default",
      SUBMITTED: "secondary",
      VOIDED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading WHT certificates...</p>
        </CardContent>
      </Card>
    );
  }

  if (certs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No WHT certificates yet. Create certificates for supplier withholding tax.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Tax Period</TableHead>
              <TableHead className="text-right">Gross Amount</TableHead>
              <TableHead className="text-right">WHT %</TableHead>
              <TableHead className="text-right">WHT Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/finance/ap/wht-certificates/${cert.id}`}
                    className="text-primary hover:underline"
                  >
                    {cert.certificateNumber}
                  </Link>
                </TableCell>
                <TableCell>{cert.whtType}</TableCell>
                <TableCell>{cert.jurisdictionCode}</TableCell>
                <TableCell>{cert.taxPeriod}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(cert.grossAmountMinor), cert.currencyCode)}
                </TableCell>
                <TableCell className="text-right">{cert.whtRatePercent}%</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(cert.whtAmountMinor), cert.currencyCode)}
                </TableCell>
                <TableCell>{getStatusBadge(cert.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(cert.certificateDate).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

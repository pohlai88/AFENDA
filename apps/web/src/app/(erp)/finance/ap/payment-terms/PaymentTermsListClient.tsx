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

interface PaymentTerms {
  id: string;
  code: string;
  description: string;
  netDays: number;
  discountPercent: string | null;
  discountDays: number | null;
  status: string;
  createdAt: string;
}

export function PaymentTermsListClient() {
  const [terms, setTerms] = useState<PaymentTerms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTerms() {
      try {
        const res = await fetch("/api/v1/payment-terms");
        if (!res.ok) throw new Error("Failed to fetch payment terms");
        const data = await res.json();
        setTerms(data.data || []);
      } catch (error) {
        console.error("Error fetching payment terms:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTerms();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading payment terms...</p>
        </CardContent>
      </Card>
    );
  }

  if (terms.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No payment terms defined yet. Create terms like NET30 or 2/10NET30.
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
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Net Days</TableHead>
              <TableHead className="text-right">Early Discount %</TableHead>
              <TableHead className="text-right">Discount Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/finance/ap/payment-terms/${term.id}`}
                    className="text-primary hover:underline"
                  >
                    {term.code}
                  </Link>
                </TableCell>
                <TableCell>{term.description}</TableCell>
                <TableCell className="text-right">{term.netDays}</TableCell>
                <TableCell className="text-right">
                  {term.discountPercent ? `${term.discountPercent}%` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {term.discountDays || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={term.status === "active" ? "default" : "secondary"}>
                    {term.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(term.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import {
  listTreasuryFxRateSnapshotsAction,
  upsertTreasuryFxRateSnapshotAction,
} from "../actions";

export const metadata: Metadata = {
  title: "FX Rates - Treasury - AFENDA",
  description: "Manage FX rate snapshots used by treasury cash position and liquidity forecasts",
};

export default async function TreasuryFxRatesPage() {
  const snapshots = await listTreasuryFxRateSnapshotsAction();

  async function upsertFxRate(formData: FormData) {
    "use server";

    await upsertTreasuryFxRateSnapshotAction({
      rateDate: String(formData.get("rateDate") ?? ""),
      fromCurrencyCode: String(formData.get("fromCurrencyCode") ?? "").toUpperCase(),
      toCurrencyCode: String(formData.get("toCurrencyCode") ?? "").toUpperCase(),
      rateScaled: String(formData.get("rateScaled") ?? ""),
      scale: Number(formData.get("scale") ?? "0"),
      providerCode: String(formData.get("providerCode") ?? ""),
      sourceVersion: String(formData.get("sourceVersion") ?? ""),
    });

    revalidatePath("/finance/treasury/fx-rates");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FX Rate Snapshots</h1>
        <p className="text-sm text-muted-foreground">
          Seed or update FX rates used by treasury base-currency normalization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upsert FX Snapshot</CardTitle>
          <CardDescription>
            Uses the unique key: rate date + currency pair + source version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertFxRate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="rateDate">Rate Date</Label>
              <Input id="rateDate" name="rateDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromCurrencyCode">From Currency</Label>
              <Input id="fromCurrencyCode" name="fromCurrencyCode" maxLength={3} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toCurrencyCode">To Currency</Label>
              <Input id="toCurrencyCode" name="toCurrencyCode" maxLength={3} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateScaled">Rate Scaled</Label>
              <Input id="rateScaled" name="rateScaled" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale">Scale</Label>
              <Input id="scale" name="scale" type="number" min={1} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCode">Provider Code</Label>
              <Input id="providerCode" name="providerCode" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceVersion">Source Version</Label>
              <Input id="sourceVersion" name="sourceVersion" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Save FX Snapshot</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Rate Scaled</TableHead>
                <TableHead>Scale</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Source Version</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(snapshots.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No FX snapshots found.
                  </TableCell>
                </TableRow>
              ) : (
                (snapshots.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rateDate}</TableCell>
                    <TableCell>{row.fromCurrencyCode}/{row.toCurrencyCode}</TableCell>
                    <TableCell className="font-mono">{row.rateScaled}</TableCell>
                    <TableCell>{row.scale}</TableCell>
                    <TableCell>{row.providerCode}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sourceVersion}</TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

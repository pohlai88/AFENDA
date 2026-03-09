/**
 * Export utilities — metadata-driven CSV, Excel, PDF export.
 *
 * Uses FieldKit exportAdapter per column type. Respects visible columns
 * and applies current sort. Max 10,000 rows for list exports.
 * PDF: React-PDF (primary), Puppeteer API (fallback), HTML print (last resort).
 */
import { createElement } from "react";
import ExcelJS from "exceljs";
import { getView, getEntity, getFieldKit } from "@afenda/ui";
import type { FieldType } from "@afenda/contracts";

const MAX_EXPORT_ROWS = 10_000;

export interface ExportColumn {
  fieldKey: string;
  label: string;
  fieldType: string;
}

/** Get export columns from entity view (list default). */
export function getExportColumns(
  entityKey: string,
  visibleFieldKeys?: string[],
): ExportColumn[] {
  const { fieldDefs } = getEntity(entityKey);
  const view = getView(entityKey, "default") as { columns?: { fieldKey: string }[] };
  const columns = view.columns ?? [];

  const defMap = new Map(fieldDefs.map((f) => [f.fieldKey, f]));
  const result: ExportColumn[] = [];

  for (const col of columns) {
    const key = col.fieldKey;
    if (visibleFieldKeys && visibleFieldKeys.length > 0 && !visibleFieldKeys.includes(key)) {
      continue;
    }
    const def = defMap.get(key);
    if (!def) continue;
    result.push({
      fieldKey: key,
      label: def.label ?? key,
      fieldType: def.fieldType,
    });
  }

  return result;
}

type ExportScalar = string | number | boolean | null;

/** Transform a row using FieldKit export adapters. */
export function transformRowForExport(
  record: Record<string, unknown>,
  columns: ExportColumn[],
): ExportScalar[] {
  return columns.map((col) => {
    const kit = getFieldKit(col.fieldType as FieldType);
    const value = record[col.fieldKey];
    return kit.exportAdapter(value, record);
  });
}

/** Export records to CSV string. */
export function exportToCsv(
  records: Record<string, unknown>[],
  columns: ExportColumn[],
): string {
  const limited = records.slice(0, MAX_EXPORT_ROWS);
  const headers = columns.map((c) => c.label);
  const rows = limited.map((r) => transformRowForExport(r, columns));
  const escape = (v: ExportScalar) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\n");
}

/** Export records to CSV and trigger download. */
export function downloadCsv(
  records: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): void {
  const csv = exportToCsv(records, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export records to Excel (ExcelJS) and trigger download. */
export async function exportToExcel(
  records: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
): Promise<void> {
  const limited = records.slice(0, MAX_EXPORT_ROWS);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headerRow = sheet.addRow(columns.map((c) => c.label));
  headerRow.font = { bold: true };

  for (const record of limited) {
    const values = transformRowForExport(record, columns);
    sheet.addRow(values);
  }

  sheet.columns.forEach((col, i) => {
    // Auto-width based on content
    let maxLen = 10;
    col?.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export records to PDF (React-PDF). Falls back to HTML print if React-PDF fails. */
export async function exportToPdf(
  records: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string,
  filename?: string,
): Promise<void> {
  const limited = records.slice(0, MAX_EXPORT_ROWS);
  const headers = columns.map((c) => ({ label: c.label }));
  const rows = limited.map((r) => transformRowForExport(r, columns));
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    const { pdf } = await import("@react-pdf/renderer");
    const { PdfExportDocument } = await import("@/components/PdfExportDocument");
    const doc = createElement(PdfExportDocument, {
      title,
      columns: headers,
      rows,
      generatedAt,
    });
    const blob = await pdf(doc).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${title.replace(/\s+/g, "-")}-${generatedAt.slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: Puppeteer API (server-side) or HTML print
    const apiOk = await tryPuppeteerPdfApi(headers, rows, title, filename);
    if (!apiOk) {
      fallbackPdfPrint(headers.map((h) => h.label), rows, title, limited.length);
    }
  }
}

/** Fallback: try Puppeteer API (server-side). Returns true if successful. */
async function tryPuppeteerPdfApi(
  columns: { label: string }[],
  rows: ExportScalar[][],
  title: string,
  filename?: string,
): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiBase}/v1/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, columns, rows }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${title.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Fallback PDF: HTML table in new window, triggers print. */
function fallbackPdfPrint(
  headers: string[],
  rows: ExportScalar[][],
  title: string,
  recordCount: number,
): void {
  const thCells = headers.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("");
  const trRows = rows
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td>${escapeHtml(String(v ?? ""))}</td>`).join("")}</tr>`,
    )
    .join("");
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:12px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 10px;text-align:left} th{background:#f5f5f5;font-weight:600} .header{margin-bottom:16px}</style></head>
<body><div class="header"><h1>${escapeHtml(title)}</h1><p>Generated: ${generatedAt}</p><p>${recordCount} records</p></div>
<table><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table></body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
    win.close();
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Export single record to CSV (for RecordFunctionBar). */
export function exportSingleRecordToCsv(
  record: Record<string, unknown>,
  columns: ExportColumn[],
  filename: string,
): void {
  downloadCsv([record], columns, filename);
}

/** Export single record to CSV/Excel/PDF (for RecordFunctionBar). */
export async function exportSingleRecord(
  record: Record<string, unknown>,
  entityKey: string,
  format: "csv" | "xlsx" | "pdf",
): Promise<void> {
  const columns = getExportColumns(entityKey);
  const baseName = `export-${String(record.id ?? "record").slice(0, 8)}`;
  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    exportSingleRecordToCsv(record, columns, `${baseName}-${date}.csv`);
  } else if (format === "xlsx") {
    await exportToExcel([record], columns, `${baseName}-${date}.xlsx`);
  } else {
    await exportToPdf(
      [record],
      columns,
      `Export ${record.id ?? "Record"}`,
      `${baseName}-${date}.pdf`,
    );
  }
}

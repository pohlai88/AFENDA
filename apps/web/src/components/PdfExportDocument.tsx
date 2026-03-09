"use client";

/**
 * PdfExportDocument — React-PDF document for list/record export.
 *
 * Branded header (title + timestamp), formatted table, page breaks.
 * Used by export-utils exportToPdf().
 */
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

export interface PdfExportDocumentProps {
  title: string;
  columns: { label: string }[];
  rows: (string | number | boolean | null)[][];
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "var(--border)",
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "var(--muted-foreground)",
  },
  table: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "var(--border)",
    minHeight: 24,
    alignItems: "center",
  },
  tableRowHeader: {
    backgroundColor: "var(--muted)",
    fontWeight: "bold",
  },
  tableCell: {
    padding: 6,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "var(--muted-foreground)",
    textAlign: "center",
  },
});

export function PdfExportDocument({
  title,
  columns,
  rows,
  generatedAt,
}: PdfExportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            Generated: {generatedAt} · {rows.length} record{rows.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            {columns.map((col, i) => (
              <Text key={i} style={styles.tableCell}>
                {col.label}
              </Text>
            ))}
          </View>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.tableRow}>
              {row.map((cell, cellIdx) => (
                <Text key={cellIdx} style={styles.tableCell}>
                  {cell != null ? String(cell) : ""}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          AFENDA · {title} · {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}

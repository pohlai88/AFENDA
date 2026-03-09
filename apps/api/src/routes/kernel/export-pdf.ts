/**
 * Export PDF route — Puppeteer fallback for server-side PDF generation.
 *
 * Use when React-PDF (client) fails or for very large documents.
 * Puppeteer is optional — returns 503 if not installed.
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";

const ExportPdfBodySchema = z.object({
  title: z.string().max(256),
  columns: z.array(z.object({ label: z.string() })),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
});

export async function exportPdfRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  app.post(
    "/export/pdf",
    {
      schema: {
        body: ExportPdfBodySchema,
        response: {
          200: { type: "string", format: "binary" },
          503: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      let puppeteer: typeof import("puppeteer");
      try {
        puppeteer = await import("puppeteer");
      } catch {
        return reply.code(503).send({
          error: "PDF export unavailable (Puppeteer not installed)",
        });
      }

      const { title, columns, rows } = ExportPdfBodySchema.parse(req.body);

      const thCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
      const trRows = rows
        .map(
          (row) =>
            `<tr>${row.map((v) => `<td>${escapeHtml(String(v ?? ""))}</td>`).join("")}</tr>`,
        )
        .join("");
      const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:20px;font-size:10px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 10px;text-align:left} th{background:#f5f5f5;font-weight:600} .header{margin-bottom:16px}</style></head>
<body><div class="header"><h1>${escapeHtml(title)}</h1><p>Generated: ${generatedAt}</p><p>${rows.length} records</p></div>
<table><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table></body></html>`;

      const browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
          format: "A4",
          margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
          printBackground: true,
        });
        await browser.close();

        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="${escapeFilename(title)}.pdf"`)
          .send(pdfBuffer);
      } catch (err) {
        await browser.close();
        throw err;
      }
    },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 64);
}

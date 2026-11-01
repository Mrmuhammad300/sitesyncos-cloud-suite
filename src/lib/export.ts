/**
 * Export utilities for CSV and PDF (print) output.
 */

type Row = Record<string, unknown>;

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Download data as a CSV file.
 * @param rows  Array of objects — keys become headers.
 * @param filename  Filename without extension.
 * @param columns  Optional column whitelist/rename map { key: label }.
 */
export function exportToCSV(
  rows: Row[],
  filename: string,
  columns?: Record<string, string>
) {
  if (rows.length === 0) return;

  const keys = columns ? Object.keys(columns) : Object.keys(rows[0]);
  const headers = columns ? Object.values(columns) : keys;

  const csv = [
    headers.join(","),
    ...rows.map((row) => keys.map((k) => escapeCSV(row[k])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Print a section of the page as a PDF via the browser print dialog.
 * @param title  Title shown at top of printed page.
 * @param tableHtml  Inner HTML of the table to print.
 */
export function printToPDF(title: string, tableHtml: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html><head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    h1 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    p.meta { font-size: 10px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f4f4f5; font-weight: 600; text-align: left; padding: 6px 8px; border: 1px solid #e4e4e7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 6px 8px; border: 1px solid #e4e4e7; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head><body>
  <h1>${title}</h1>
  <p class="meta">Exported ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · SiteSync Cloud Suite</p>
  ${tableHtml}
  <script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`);
  win.document.close();
}

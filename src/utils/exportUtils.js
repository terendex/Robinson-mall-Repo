/**
 * exportUtils.js
 * Shared export helpers for CSV and Excel (.xlsx) downloads.
 * Uses SheetJS (xlsx) for Excel generation — no server needed.
 */
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Internal: trigger a browser file download
// ─────────────────────────────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// exportCSV
//   rows     – array of plain objects (all values become strings)
//   filename – e.g. 'transactions-2026-04.csv'
// ─────────────────────────────────────────────────────────────────────────────
export function exportCSV(rows, filename) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// exportExcel
//   rows      – array of plain objects
//   sheetName – tab name inside the workbook
//   filename  – e.g. 'transactions-2026-04.xlsx'
// ─────────────────────────────────────────────────────────────────────────────
export function exportExcel(rows, sheetName, filename) {
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths based on max character length
  const headers = Object.keys(rows[0]);
  worksheet['!cols'] = headers.map(h => ({
    wch: Math.max(
      h.length,
      ...rows.map(r => String(r[h] ?? '').length)
    ) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: build the row arrays expected by each page
// ─────────────────────────────────────────────────────────────────────────────

/** Format a Transactions array into export-ready flat rows. */
export function buildTransactionRows(transactions) {
  return transactions.map(t => ({
    'Transaction ID':  t.transaction_id || `TXN-${t.id}`,
    'Customer':        t.user_name   || 'Anonymous',
    'Store':           t.store_name  || '—',
    'Amount (₱)':      t.amount      ? Number(t.amount).toFixed(2) : '0.00',
    'Voucher':         t.voucher_name || '—',
    'Voucher Code':    t.voucher_code || '—',
    'Receipt No.':     t.receipt_no  || '—',
    'Date':            t.created_at  ? new Date(t.created_at).toLocaleString() : '—',
    'Expiry Date':     t.expiry_date || '—',
    'Status':          t.status      || '—',
  }));
}

/** Format a Claims/Reports array into export-ready flat rows. */
export function buildReportRows(claims, period) {
  return claims.map(c => ({
    'Status':          c.status      || '—',
    'Customer':        c.user_name   || 'Anonymous',
    'Voucher':         c.voucher_name || '—',
    'Voucher Code':    c.voucher_code || '—',
    'Store':           c.store_name  || '—',
    'Amount (₱)':      c.amount      ? Number(c.amount).toFixed(2) : '0.00',
    'Receipt No.':     c.receipt_no  || '—',
    'Date':            c.created_at  ? new Date(c.created_at).toLocaleString() : '—',
    'Period Filter':   period,
  }));
}

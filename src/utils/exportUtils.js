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
  try {
    if (!rows || !rows.length) {
      console.warn('exportCSV: No data to export.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const exportType = filename.split('-')[0].toUpperCase();
    const csvLines = [
      `"ROBINSON MALL - REWARDS & LOYALTY PORTAL"`,
      `"Export Type: ${exportType} REPORT"`,
      `"Generated On: ${new Date().toLocaleString()}"`,
      ``, // blank spacing line
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    // Add UTF-8 BOM (\ufeff) for Excel compatibility
    const blob = new Blob(["\ufeff", csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, filename);
  } catch (err) {
    console.error('exportCSV failed:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// exportExcel
//   rows      – array of plain objects
//   sheetName – tab name inside the workbook
//   filename  – e.g. 'transactions-2026-04.xlsx'
// ─────────────────────────────────────────────────────────────────────────────
export function exportExcel(rows, sheetName, filename) {
  try {
    if (!rows || !rows.length) {
      console.warn('exportExcel: No data to export.');
      return;
    }

    // 1. Create workbook and metadata worksheet with premium header styling
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      [`ROBINSON MALL - REWARDS & LOYALTY PORTAL`],
      [`Export Type: ${sheetName.toUpperCase()} REPORT`],
      [`Generated On: ${new Date().toLocaleString()}`],
      [], // blank spacing row
    ]);

    // 2. Add JSON data starting at Row 5 (origin A5)
    XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A5' });

    // 3. Apply custom cell formatting and number formats for visual excellence
    const headers = Object.keys(rows[0]);
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (!cell) continue;

        // Skip metadata header block (rows 1-4)
        if (R < 4) continue;

        // Apply clean number formatting to numerical fields
        if (typeof cell.v === 'number') {
          const headerName = headers[C];
          if (headerName && (headerName.toLowerCase().includes('amount') || headerName.includes('₱'))) {
            cell.t = 'n';
            cell.z = '₱#,##0.00'; // Format as Philippine Peso currency
          } else {
            cell.t = 'n';
            cell.z = '#,##0'; // Regular integers
          }
        }
      }
    }

    // 4. Auto-fit column widths based on headers and data length (excluding top metadata title rows)
    worksheet['!cols'] = headers.map((h, colIndex) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => String(r[h] ?? '').length)
      );
      return { wch: maxLen + 4 }; // Generous padding for clean appearance
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, filename);
  } catch (err) {
    console.error('exportExcel failed:', err);
    throw err;
  }
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
    'Amount (₱)':      t.amount      ? Number(t.amount) : 0.00,
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
    'Amount (₱)':      c.amount      ? Number(c.amount) : 0.00,
    'Receipt No.':     c.receipt_no  || '—',
    'Date':            c.created_at  ? new Date(c.created_at).toLocaleString() : '—',
    'Period Filter':   period,
  }));
}

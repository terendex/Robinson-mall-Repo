import React, { useState, useEffect, useRef } from 'react';
import '../css/Transactionmodal.css';

// ── RapidAPI OCR key (replace with your actual key) ──
const RAPIDAPI_KEY = '31f3e07862mshfaae46f3ba33f1ap179571jsne8f7d559775b';

// ─────────────────────────────────────────────────────
// Receipt text parser
// Tries to extract structured fields from raw OCR text
// ─────────────────────────────────────────────────────
const parseReceiptText = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const full  = rawText;
  const extracted = {};

  // ── Receipt / OR No. ──
  const receiptPatterns = [
    /(?:receipt|rcpt|or|official receipt|ref|reference)[#\s:no.]*([A-Z0-9\-]{4,})/i,
    /(?:invoice|inv)[#\s:no.]*([A-Z0-9\-]{4,})/i,
    /#\s*([A-Z0-9\-]{5,})/i,
  ];
  for (const p of receiptPatterns) {
    const m = full.match(p);
    if (m) { extracted.receipt_no = m[1].trim(); break; }
  }

  // ── Customer / Cashier name ──
  const namePatterns = [
    /(?:customer|client|billed to|name)[:\s]+([A-Za-z ]{3,40})/i,
    /(?:cashier|served by)[:\s]+([A-Za-z ]{3,30})/i,
  ];
  for (const p of namePatterns) {
    const m = full.match(p);
    if (m) { extracted.user_name = m[1].trim(); break; }
  }

  // ── Voucher code (all-caps alphanumeric, 4–16 chars) ──
  const voucherCodeMatch = full.match(
    /(?:voucher|promo|discount|code)[:\s]+([A-Z0-9]{4,16})/i
  );
  if (voucherCodeMatch) extracted.voucher_code = voucherCodeMatch[1].trim();

  // ── Voucher / item name ──
  const voucherNameMatch = full.match(
    /(?:voucher name|promo name|item|description)[:\s]+([A-Za-z0-9 %&\-]{3,50})/i
  );
  if (voucherNameMatch) extracted.voucher_name = voucherNameMatch[1].trim();

  // ── Date  (various formats) ──
  const datePatterns = [
    // YYYY-MM-DD
    { re: /(\d{4}-\d{2}-\d{2})/, fmt: (m) => m[1] },
    // MM/DD/YYYY or DD/MM/YYYY
    { re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, fmt: (m) => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
    // Month DD, YYYY
    { re: /([A-Za-z]+ \d{1,2},?\s*\d{4})/, fmt: (m) => { const d = new Date(m[1]); return isNaN(d) ? null : d.toISOString().split('T')[0]; } },
  ];
  for (const { re, fmt } of datePatterns) {
    const m = full.match(re);
    if (m) {
      const val = fmt(m);
      if (val) { extracted.created_at = val + 'T00:00'; break; }
    }
  }

  // ── Status — look for known keywords ──
  if (/redeemed|used|availed/i.test(full))    extracted.status = 'Redeemed';
  else if (/expired|invalid/i.test(full))     extracted.status = 'Expired';
  else if (/pending|processing/i.test(full))  extracted.status = 'Pending';

  return extracted;
};

// ─────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────
const TransactionModal = ({ show, onClose, onSave, transactionToEdit }) => {
  const [formData, setFormData] = useState({
    receipt_no:   '',
    user_name:    '',
    voucher_name: '',
    voucher_code: '',
    created_at:   '',
    expiry_date:  '',
    status:       'Redeemed',
  });

  const [ocrState, setOcrState] = useState('idle'); // idle | scanning | done | error
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrRawText, setOcrRawText] = useState('');
  const [filledFields, setFilledFields] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (transactionToEdit) {
      const toDatetimeLocal = (str) => {
        if (!str) return '';
        const d = new Date(str);
        return d.toISOString().slice(0, 16);
      };
      setFormData({
        receipt_no:   transactionToEdit.receipt_no   || '',
        user_name:    transactionToEdit.user_name     || '',
        voucher_name: transactionToEdit.voucher_name  || '',
        voucher_code: transactionToEdit.voucher_code  || '',
        created_at:   toDatetimeLocal(transactionToEdit.created_at),
        expiry_date:  transactionToEdit.expiry_date   || '',
        status:       transactionToEdit.status        || 'Redeemed',
      });
    } else {
      setFormData({
        receipt_no:   '',
        user_name:    '',
        voucher_name: '',
        voucher_code: '',
        created_at:   '',
        expiry_date:  '',
        status:       'Redeemed',
      });
    }
    // Reset OCR state each time modal opens
    setOcrState('idle');
    setOcrPreview(null);
    setOcrRawText('');
    setFilledFields([]);
  }, [transactionToEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // ── OCR: file selected ──
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setOcrPreview(ev.target.result);
    reader.readAsDataURL(file);

    setOcrState('scanning');
    setFilledFields([]);

    try {
      const body = new FormData();
      body.append('image', file);

      const response = await fetch('https://ocr43.p.rapidapi.com/v1/results', {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key':  RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'ocr43.p.rapidapi.com',
        },
        body,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();

      // Extract full text from api4ai response structure
      const rawText =
        data?.results?.[0]?.entities?.[0]?.objects
          ?.map(obj => obj?.entities?.find(e => e.kind === 'text')?.name || '')
          .join('\n') || '';

      setOcrRawText(rawText);

      if (!rawText.trim()) {
        setOcrState('error');
        return;
      }

      // Parse and fill form
      const parsed = parseReceiptText(rawText);
      const filled = [];

      setFormData((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(parsed)) {
          if (val && !prev[key]) {
            next[key] = val;
            filled.push(key);
          }
        }
        return next;
      });

      setFilledFields(filled);
      setOcrState('done');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrState('error');
    }

    // Reset file input so same file can be re-scanned
    e.target.value = '';
  };

  const fieldLabel = {
    receipt_no:   'Receipt No.',
    user_name:    'Customer Name',
    voucher_name: 'Voucher Name',
    voucher_code: 'Voucher Code',
    created_at:   'Timestamp',
    status:       'Status',
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content txn-form-modal">

        {/* ── Header ── */}
        <div className="modal-header">
          <h2>{transactionToEdit ? 'Edit Transaction Details' : 'Record New Transaction'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>

        {/* ── OCR Scan Receipt Banner ── */}
        <div className="ocr-scan-section">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {ocrState === 'idle' && (
            <button
              type="button"
              className="ocr-scan-btn"
              onClick={() => fileInputRef.current.click()}
            >
              <i className="fa-solid fa-camera"></i>
              Scan Receipt to Auto-fill
            </button>
          )}

          {ocrState === 'scanning' && (
            <div className="ocr-status scanning">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Scanning receipt…</span>
            </div>
          )}

          {ocrState === 'done' && (
            <div className="ocr-result-banner">
              <div className="ocr-result-left">
                {ocrPreview && (
                  <img src={ocrPreview} alt="Receipt preview" className="ocr-thumb" />
                )}
                <div className="ocr-result-info">
                  <p className="ocr-result-title">
                    <i className="fa-solid fa-circle-check"></i>
                    Receipt scanned successfully
                  </p>
                  {filledFields.length > 0 ? (
                    <p className="ocr-result-sub">
                      Auto-filled: {filledFields.map(f => fieldLabel[f] || f).join(', ')}
                    </p>
                  ) : (
                    <p className="ocr-result-sub">No matching fields detected — fill manually.</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="ocr-rescan-btn"
                onClick={() => { setOcrState('idle'); setOcrPreview(null); }}
              >
                <i className="fa-solid fa-rotate-right"></i> Rescan
              </button>
            </div>
          )}

          {ocrState === 'error' && (
            <div className="ocr-status error">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Could not read receipt. Try a clearer image.</span>
              <button
                type="button"
                className="ocr-retry-btn"
                onClick={() => fileInputRef.current.click()}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>
              Receipt No.
              {filledFields.includes('receipt_no') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="text"
              name="receipt_no"
              value={formData.receipt_no}
              onChange={handleChange}
              placeholder="e.g. ABC-2026-0302-1234"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Customer Name
              {filledFields.includes('user_name') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="text"
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
              placeholder="Full Name"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Voucher Name
              {filledFields.includes('voucher_name') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="text"
              name="voucher_name"
              value={formData.voucher_name}
              onChange={handleChange}
              placeholder="Voucher Name"
            />
          </div>

          <div className="form-group">
            <label>
              Voucher Code
              {filledFields.includes('voucher_code') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="text"
              name="voucher_code"
              value={formData.voucher_code}
              onChange={handleChange}
              placeholder="Voucher Code"
            />
          </div>

          <div className="form-group">
            <label>
              Timestamp
              {filledFields.includes('created_at') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="datetime-local"
              name="created_at"
              value={formData.created_at}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>
                Status
                {filledFields.includes('status') && <span className="ocr-filled-tag">OCR</span>}
              </label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Redeemed">Redeemed</option>
                <option value="Pending">Pending</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-inner-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {transactionToEdit ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
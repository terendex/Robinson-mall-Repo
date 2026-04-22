import React, { useState, useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import axios from 'axios';
import '../css/Transactionmodal.css';

// ─────────────────────────────────────────────────────
// Receipt text parser — tuned for Robinsons receipts
// ─────────────────────────────────────────────────────
const parseReceiptText = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const full = rawText;
  const extracted = {};

  // ── Store / Branch name — match store TYPE not address ("Place La Union") ──
  if (/department\s+store/i.test(full)) {
    extracted.store_name = 'Robinsons Department Store';
  } else if (/supermarket/i.test(full)) {
    extracted.store_name = 'Robinsons Supermarket';
  } else if (/robinsons?\s+mall/i.test(full)) {
    extracted.store_name = 'Robinsons Mall';
  }

  // ── Receipt / SI No. ──
  // Tesseract often misreads capital I as: 1, l, |, or i
  // So we match S[I1li|]\s*No and also scan line-by-line as fallback
  const siMatch = full.match(/S[I1li|]\s*[Nn][o0][.:\s]+([\d]{6,})/i);
  if (siMatch) {
    extracted.receipt_no = siMatch[1].trim();
  } else {
    // Line-by-line fallback: find a line containing 'SI' or 'S1' near 'No'
    for (const line of lines) {
      if (/S[I1li|].{0,4}No/i.test(line)) {
        const numMatch = line.match(/(\d{6,})/);
        if (numMatch) { extracted.receipt_no = numMatch[1]; break; }
      }
    }
  }
  // Last resort: Trans ID
  if (!extracted.receipt_no) {
    const transMatch = full.match(/Trans(?:action)?\s*ID[:\s]+(\d+)/i);
    if (transMatch) extracted.receipt_no = transMatch[1].trim();
  }

  // ── Amount — require decimal (X.XX) to avoid matching cashier ID etc. ──
  // Tesseract often reads ₱ as P, p, or omits it entirely
  const totalMatch = full.match(/TOTAL\s+[P₱p]?\s*([\d,]+\.\d{2})/i);
  if (totalMatch) {
    extracted.amount = totalMatch[1].replace(/,/g, '').trim();
  } else {
    const amtFallback = full.match(/(?:amount|grand\s+total)[:\s]+[P₱p]?\s*([\d,]+\.\d{2})/i);
    if (amtFallback) extracted.amount = amtFallback[1].replace(/,/g, '').trim();
  }

  // ── Cashier / Customer name ──
  // Robinsons: "Cashier: 112 Rhea Navidad" — skip optional numeric cashier ID
  const cashierMatch = full.match(/Cashier[:\s]+\d*\s*([A-Za-z][A-Za-z .]{2,40})/i);
  if (cashierMatch) {
    extracted.user_name = cashierMatch[1].trim();
  } else {
    const nameMatch = full.match(/(?:customer|client|billed\s+to)[:\s]+([A-Za-z][A-Za-z .]{2,40})/i);
    if (nameMatch) extracted.user_name = nameMatch[1].trim();
  }

  // ── Voucher code ──
  const voucherCodeMatch = full.match(
    /(?:voucher|promo|discount|code)[:\s]+([A-Z0-9]{4,16})/i
  );
  if (voucherCodeMatch) extracted.voucher_code = voucherCodeMatch[1].trim();

  // ── Voucher / item name ──
  const voucherNameMatch = full.match(
    /(?:voucher name|promo name|item|description)[:\s]+([A-Za-z0-9 %&\-]{3,50})/i
  );
  if (voucherNameMatch) extracted.voucher_name = voucherNameMatch[1].trim();

  // ── Date + Time — combined Robinsons format: "Date:12/22/2025 Time:15:41:10" ──
  const dateTimeMatch = full.match(
    /Date[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+Time[:\s]+(\d{1,2}):(\d{2})/i
  );
  if (dateTimeMatch) {
    const [, mo, dy, yr, hh, mm] = dateTimeMatch;
    extracted.created_at =
      `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}`;
  } else {
    // Fallbacks
    const isoMatch = full.match(/(\d{4}-\d{2}-\d{2})/);
    const slashMatch = full.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const timeOnly = full.match(/Time[:\s]+(\d{1,2}:\d{2})/i);
    const timePart = timeOnly ? `T${timeOnly[1].padStart(5, '0')}` : 'T00:00';
    if (isoMatch) {
      extracted.created_at = isoMatch[1] + timePart;
    } else if (slashMatch) {
      const [, m2, d2, y2] = slashMatch;
      extracted.created_at = `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}${timePart}`;
    }
  }

  // ── Status ──
  if (/redeemed|used|availed/i.test(full)) extracted.status = 'Redeemed';
  else if (/expired|invalid/i.test(full)) extracted.status = 'Expired';
  else if (/pending|processing/i.test(full)) extracted.status = 'Pending';

  return extracted;
};

// ─────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────
const TransactionModal = ({ show, onClose, onSave, transactionToEdit }) => {
  const [formData, setFormData] = useState({
    receipt_no: '',
    user_name: '',
    store_name: '',
    amount: '',
    voucher_name: '',
    voucher_code: '',
    created_at: '',
    expiry_date: '',
    status: 'Redeemed',
  });

  const [ocrState, setOcrState] = useState('idle');
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrRawText, setOcrRawText] = useState('');
  const [filledFields, setFilledFields] = useState([]);

  // Voucher dropdown state
  const [vouchers, setVouchers] = useState([]);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
  const voucherDropdownRef = useRef(null);

  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Fetch vouchers on mount
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/vouchers/')
      .then(res => setVouchers(res.data))
      .catch(err => console.error('Failed to load vouchers:', err));
  }, []);

  // Close voucher dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (voucherDropdownRef.current && !voucherDropdownRef.current.contains(e.target)) {
        setShowVoucherDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (transactionToEdit) {
      const toDatetimeLocal = (str) => {
        if (!str) return '';
        const d = new Date(str);
        return d.toISOString().slice(0, 16);
      };
      setFormData({
        receipt_no: transactionToEdit.receipt_no || '',
        user_name: transactionToEdit.user_name || '',
        store_name: transactionToEdit.store_name || '',
        amount: transactionToEdit.amount || '',
        voucher_name: transactionToEdit.voucher_name || '',
        voucher_code: transactionToEdit.voucher_code || '',
        created_at: toDatetimeLocal(transactionToEdit.created_at),
        expiry_date: transactionToEdit.expiry_date || '',
        status: transactionToEdit.status || 'Redeemed',
      });
    } else {
      setFormData({
        receipt_no: '',
        user_name: '',
        store_name: '',
        amount: '',
        voucher_name: '',
        voucher_code: '',
        created_at: '',
        expiry_date: '',
        status: 'Redeemed',
      });
    }
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
    onSave({ ...formData, receipt_image: ocrPreview || null });
  };

  // ── Core OCR runner (Tesseract.js — runs in browser, no API key needed) ──
  const runOcr = async (file) => {
    if (!file) return;

    // Show image preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setOcrPreview(ev.target.result);
    reader.readAsDataURL(file);

    setOcrState('scanning');
    setFilledFields([]);

    let worker;
    try {
      worker = await createWorker('eng', 1, {
        logger: () => { }, // suppress verbose logs
      });

      const { data: { text: rawText } } = await worker.recognize(file);

      setOcrRawText(rawText);

      if (!rawText.trim()) { setOcrState('error'); return; }

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
    } finally {
      if (worker) await worker.terminate();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await runOcr(file);
    e.target.value = '';
  };

  const handleRescan = () => {
    setOcrState('idle');
    setOcrPreview(null);
    setOcrRawText('');
    setFilledFields([]);
  };

  const fieldLabel = {
    receipt_no: 'Receipt No.',
    user_name: 'Customer Name',
    store_name: 'Store',
    amount: 'Amount',
    voucher_name: 'Voucher Name',
    voucher_code: 'Voucher Code',
    created_at: 'Timestamp',
    status: 'Status',
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content txn-form-modal">

        {/* ── Header ── */}
        <div className="modal-header">
          <h2>{transactionToEdit ? 'Edit Transaction Details' : 'Record New Transaction'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>

        {/* ── Hidden file inputs ── */}
        <input
          type="file"
          accept="image/*"
          ref={uploadInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* ── OCR Scan Receipt Section ── */}
        <div className="ocr-scan-section">

          {/* Idle: show Camera / Upload choice */}
          {ocrState === 'idle' && (
            <div className="ocr-choice-wrapper">
              <p className="ocr-choice-label">
                <i className="fa-solid fa-receipt"></i>
                Scan receipt to auto-fill fields
              </p>
              <div className="ocr-choice-buttons">
                <button
                  type="button"
                  className="ocr-choice-btn camera"
                  onClick={() => cameraInputRef.current.click()}
                >
                  <i className="fa-solid fa-camera"></i>
                  <span>Use Camera</span>
                </button>
                <div className="ocr-choice-divider">or</div>
                <button
                  type="button"
                  className="ocr-choice-btn upload"
                  onClick={() => uploadInputRef.current.click()}
                >
                  <i className="fa-solid fa-arrow-up-from-bracket"></i>
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          )}

          {/* Scanning */}
          {ocrState === 'scanning' && (
            <div className="ocr-status scanning">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Reading receipt… this may take a few seconds.</span>
            </div>
          )}

          {/* Done */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="ocr-rescan-btn"
                  onClick={handleRescan}
                >
                  <i className="fa-solid fa-rotate-right"></i> Rescan
                </button>
                <button
                  type="button"
                  className="ocr-debug-btn"
                  onClick={() => {
                    // Print raw OCR text to console for debugging
                    console.group('🧠 Tesseract Raw OCR Output');
                    console.log(ocrRawText);
                    console.groupEnd();
                    alert('Raw OCR text printed to browser console (F12 → Console tab).');
                  }}
                >
                  <i className="fa-solid fa-bug"></i> Debug
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {ocrState === 'error' && (
            <div className="ocr-status error">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Could not read receipt. Try a clearer image.</span>
              <button
                type="button"
                className="ocr-retry-btn"
                onClick={handleRescan}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>

          {/* SI No. */}
          <div className="form-group">
            <label>
              SI No.
              {filledFields.includes('receipt_no') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="text"
              name="receipt_no"
              value={formData.receipt_no}
              onChange={handleChange}
              placeholder="e.g. 0000324277"
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

          <div className="form-row">
            <div className="form-group">
              <label>
                Store / Branch
                {filledFields.includes('store_name') && <span className="ocr-filled-tag">OCR</span>}
              </label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="e.g. Robinsons Supermarket"
              />
            </div>
            <div className="form-group">
              <label>
                Amount (₱)
                {filledFields.includes('amount') && <span className="ocr-filled-tag">OCR</span>}
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Timestamp — above voucher fields */}
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

          {/* Voucher — searchable dropdown connected to Vouchers page */}
          <div className="form-group" ref={voucherDropdownRef}>
            <label>
              Voucher
              {filledFields.includes('voucher_name') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <div className="voucher-select-wrapper">
              <div
                className={`voucher-select-trigger ${showVoucherDropdown ? 'open' : ''}`}
                onClick={() => setShowVoucherDropdown(v => !v)}
              >
                {formData.voucher_name ? (
                  <span className="voucher-select-chosen">
                    <strong>{formData.voucher_name}</strong>
                    <span className="voucher-select-code">{formData.voucher_code}</span>
                  </span>
                ) : (
                  <span className="voucher-select-placeholder">Select a voucher…</span>
                )}
                <i className={`fa-solid fa-chevron-${showVoucherDropdown ? 'up' : 'down'}`}></i>
              </div>

              {showVoucherDropdown && (
                <div className="voucher-select-dropdown">
                  <div className="voucher-select-search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Search vouchers…"
                      value={voucherSearch}
                      onChange={e => setVoucherSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="voucher-select-list">
                    {/* Clear option */}
                    <div
                      className="voucher-select-option clear-option"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, voucher_name: '', voucher_code: '' }));
                        setShowVoucherDropdown(false);
                        setVoucherSearch('');
                      }}
                    >
                      <span className="voucher-select-none">— None —</span>
                    </div>

                    {vouchers
                      .filter(v =>
                        v.is_active &&
                        (v.name.toLowerCase().includes(voucherSearch.toLowerCase()) ||
                          v.code.toLowerCase().includes(voucherSearch.toLowerCase()))
                      )
                      .map(v => (
                        <div
                          key={v.id}
                          className={`voucher-select-option ${formData.voucher_code === v.code ? 'selected' : ''
                            }`}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              voucher_name: v.name,
                              voucher_code: v.code,
                            }));
                            setShowVoucherDropdown(false);
                            setVoucherSearch('');
                          }}
                        >
                          <span className="voucher-opt-name">{v.name}</span>
                          <span className="voucher-opt-meta">
                            <span className="voucher-opt-code">{v.code}</span>
                            <span className="voucher-opt-discount">{v.discount_percentage}% off</span>
                          </span>
                        </div>
                      ))
                    }

                    {vouchers.filter(v =>
                      v.is_active &&
                      (v.name.toLowerCase().includes(voucherSearch.toLowerCase()) ||
                        v.code.toLowerCase().includes(voucherSearch.toLowerCase()))
                    ).length === 0 && (
                        <div className="voucher-select-empty">No active vouchers found.</div>
                      )}
                  </div>
                </div>
              )}
            </div>
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
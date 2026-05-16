import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import axios from 'axios';
import '../css/Transactionmodal.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


// ─────────────────────────────────────────────────────
// Receipt text parser — tuned for Robinsons receipts
// ─────────────────────────────────────────────────────
const parseReceiptText = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const full = rawText;
  const extracted = {};

  // ── Store / Branch name ──
  if (/department\s+store/i.test(full)) {
    extracted.store_text = 'Robinsons Department Store';
  } else if (/supermarket/i.test(full)) {
    extracted.store_text = 'Robinsons Supermarket';
  } else if (/robinsons?\s+mall/i.test(full)) {
    extracted.store_text = 'Robinsons Mall';
  }

  // ── Receipt / SI No. ──
  const siMatch = full.match(/S[I1li|]\s*[Nn][o0][.:\s]+([\d]{6,})/i);
  if (siMatch) {
    extracted.receipt_no = siMatch[1].trim();
  } else {
    for (const line of lines) {
      if (/S[I1li|].{0,4}No/i.test(line)) {
        const numMatch = line.match(/(\d{6,})/);
        if (numMatch) { extracted.receipt_no = numMatch[1]; break; }
      }
    }
  }
  if (!extracted.receipt_no) {
    const transMatch = full.match(/Trans(?:action)?\s*ID[:\s]+(\d+)/i);
    if (transMatch) extracted.receipt_no = transMatch[1].trim();
  }

  // ── Amount ──
  const totalMatch = full.match(/TOTAL\s+[P₱p]?\s*([\d,]+\.\d{2})/i);
  if (totalMatch) {
    extracted.amount = totalMatch[1].replace(/,/g, '').trim();
  } else {
    const amtFallback = full.match(/(?:amount|grand\s+total)[:\s]+[P₱p]?\s*([\d,]+\.\d{2})/i);
    if (amtFallback) extracted.amount = amtFallback[1].replace(/,/g, '').trim();
  }

  // ── Customer name ──
  const cashierMatch = full.match(/Cashier[:\s]+\d*\s*([A-Za-z][A-Za-z .]{2,40})/i);
  if (cashierMatch) {
    extracted.user_name = cashierMatch[1].trim();
  } else {
    const nameMatch = full.match(/(?:customer|client|billed\s+to)[:\s]+([A-Za-z][A-Za-z .]{2,40})/i);
    if (nameMatch) extracted.user_name = nameMatch[1].trim();
  }

  // ── Date + Time ──
  const dateTimeMatch = full.match(
    /Date[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+Time[:\s]+(\d{1,2}):(\d{2})/i
  );
  if (dateTimeMatch) {
    const [, mo, dy, yr, hh, mm] = dateTimeMatch;
    extracted.created_at =
      `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}`;
  } else {
    const isoMatch   = full.match(/(\d{4}-\d{2}-\d{2})/);
    const slashMatch = full.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const timeOnly   = full.match(/Time[:\s]+(\d{1,2}:\d{2})/i);
    const timePart   = timeOnly ? `T${timeOnly[1].padStart(5, '0')}` : 'T00:00';
    if (isoMatch) {
      extracted.created_at = isoMatch[1] + timePart;
    } else if (slashMatch) {
      const [, m2, d2, y2] = slashMatch;
      extracted.created_at = `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}${timePart}`;
    }
  }

  return extracted;
};

// ─────────────────────────────────────────────────────
// Combobox: text input + filtered dropdown
// ─────────────────────────────────────────────────────
const Combobox = ({ value, onChange, options, placeholder, getLabel, getValue, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  // Sync external value changes (e.g. OCR fill)
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    getLabel(o).toLowerCase().includes(query.toLowerCase())
  );

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange({ text: e.target.value, item: null }); // free-text mode
    setOpen(true);
  };

  const handleSelect = (item) => {
    const label = getLabel(item);
    setQuery(label);
    onChange({ text: label, item });
    setOpen(false);
  };

  return (
    <div className="combobox-wrapper" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="combobox-dropdown">
          {filtered.length === 0 ? (
            <div className="combobox-empty">No matches — value will be saved as typed</div>
          ) : (
            filtered.slice(0, 20).map(item => (
              <div
                key={getValue(item)}
                className="combobox-option"
                onMouseDown={() => handleSelect(item)}
              >
                {getLabel(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────
const TransactionModal = ({ show, onClose, onSave, transactionToEdit }) => {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const isCustomer = user.role === 'customer';

  const [formData, setFormData] = useState({
    receipt_no: '',
    user_name:  '',
    store:      '',       // FK id (if matched)
    store_name: '',       // free-text or matched store name
    amount:     '',
    created_at: '',
    status:     'Pending',
  });

  const [ocrState,    setOcrState]    = useState('idle');
  const [ocrPreview,  setOcrPreview]  = useState(null);
  const [ocrRawText,  setOcrRawText]  = useState('');
  const [filledFields, setFilledFields] = useState([]);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState('');
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  // Data for comboboxes
  const [stores, setStores] = useState([]);
  const [users,  setUsers]  = useState([]);

  const uploadInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError('');
  }, []);

  // Fetch stores + customers on open
  useEffect(() => {
    if (!show) return;
    axios.get(`${BASE}/api/stores/`)
      .then(res => setStores(res.data))
      .catch(err => console.error('Failed to load stores:', err));
    axios.get(`${BASE}/api/users/?role=customer`)
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to load users:', err));
  }, [show]);

  useEffect(() => {
    if (transactionToEdit) {
      const toDatetimeLocal = (str) => {
        if (!str) return '';
        return new Date(str).toISOString().slice(0, 16);
      };
      setFormData({
        receipt_no: transactionToEdit.receipt_no  || '',
        user_name:  transactionToEdit.user_name   || (isCustomer ? `${user.first_name} ${user.last_name}`.trim() || user.username : ''),
        store:      transactionToEdit.store        || '',
        store_name: transactionToEdit.store_display_name || transactionToEdit.store_name || '',
        amount:     transactionToEdit.amount       || '',
        created_at: toDatetimeLocal(transactionToEdit.created_at),
        status:     transactionToEdit.status       || 'Pending',
      });
    } else {
      setFormData({
        receipt_no: '',
        user_name:  isCustomer ? `${user.first_name} ${user.last_name}`.trim() || user.username : '',
        store:      '',
        store_name: '',
        amount:     '',
        created_at: '',
        status:     'Pending',
      });
    }
    setOcrState('idle');
    setOcrPreview(null);
    setOcrRawText('');
    setFilledFields([]);
    stopCamera();
  }, [transactionToEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // created_at is read-only on the backend (auto_now_add), strip it from the payload
    const { created_at, ...submitPayload } = formData;
    onSave({
      ...submitPayload,
      receipt_image: ocrPreview || null,
    });
  };

  // ── Core OCR runner ──
  const runOcr = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setOcrPreview(ev.target.result);
    reader.readAsDataURL(file);

    setOcrState('scanning');
    setFilledFields([]);

    let worker;
    try {
      worker = await createWorker('eng', 1, { logger: () => {} });
      const { data: { text: rawText } } = await worker.recognize(file);
      setOcrRawText(rawText);
      if (!rawText.trim()) { setOcrState('error'); return; }

      const parsed = parseReceiptText(rawText);
      const filled = [];

      setFormData(prev => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(parsed)) {
          if (key === 'store_text') {
            const matched = stores.find(s =>
              s.name.toLowerCase().includes(val.toLowerCase()) ||
              val.toLowerCase().includes(s.name.toLowerCase())
            );
            if (matched && !prev.store) {
              next.store      = String(matched.id);
              next.store_name = matched.name;
              filled.push('store_name');
            } else if (!prev.store_name) {
              next.store_name = val;
              filled.push('store_name');
            }
            continue;
          }
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
    stopCamera();
  };

  const openCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera access in your browser settings.'
          : 'Could not open camera. Try uploading an image instead.'
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    canvas.toBlob(async (blob) => {
      if (!blob) { setOcrState('error'); return; }
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
      await runOcr(file);
    }, 'image/jpeg', 0.92);
  };

  const fieldLabel = {
    receipt_no: 'Receipt No.',
    user_name:  'Customer Name',
    store_name: 'Store',
    amount:     'Amount',
    created_at: 'Timestamp',
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content txn-form-modal">

        <div className="modal-header">
          <h2>{transactionToEdit ? (isCustomer ? 'Transaction Details' : 'Edit Transaction') : (isCustomer ? 'Submit New Transaction' : 'Record New Transaction')}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={uploadInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* ── OCR Scan Section ── */}
        <div className="ocr-scan-section">
          {ocrState === 'idle' && (
            <div className="ocr-choice-wrapper">
              {cameraActive && (
                <div className="camera-viewfinder-wrapper">
                  <video ref={videoRef} className="camera-viewfinder" autoPlay playsInline muted />
                  <div className="camera-viewfinder-controls">
                    <button type="button" className="camera-cancel-btn" onClick={stopCamera}>
                      <i className="fa-solid fa-xmark"></i> Cancel
                    </button>
                    <button type="button" className="camera-shutter-btn" onClick={capturePhoto}>
                      <i className="fa-solid fa-circle"></i>
                    </button>
                    <div style={{ width: 80 }} />
                  </div>
                </div>
              )}
              {cameraError && (
                <p className="camera-error-msg">
                  <i className="fa-solid fa-triangle-exclamation"></i> {cameraError}
                </p>
              )}
              {!cameraActive && (
                <>
                  <p className="ocr-choice-label">
                    <i className="fa-solid fa-receipt"></i>
                    Scan receipt to auto-fill fields
                  </p>
                  <div className="ocr-choice-buttons">
                    <button type="button" className="ocr-choice-btn camera" onClick={openCamera}>
                      <i className="fa-solid fa-camera"></i>
                      <span>Use Camera</span>
                    </button>
                    <div className="ocr-choice-divider">or</div>
                    <button type="button" className="ocr-choice-btn upload" onClick={() => uploadInputRef.current.click()}>
                      <i className="fa-solid fa-arrow-up-from-bracket"></i>
                      <span>Upload Image</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {ocrState === 'scanning' && (
            <div className="ocr-status scanning">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Reading receipt… this may take a few seconds.</span>
            </div>
          )}

          {ocrState === 'done' && (
            <div className="ocr-result-banner">
              <div className="ocr-result-left">
                {ocrPreview && <img src={ocrPreview} alt="Receipt" className="ocr-thumb" />}
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
                    <p className="ocr-result-sub">No fields detected — fill manually.</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                <button type="button" className="ocr-rescan-btn" onClick={handleRescan}>
                  <i className="fa-solid fa-rotate-right"></i> Rescan
                </button>
                <button
                  type="button"
                  className="ocr-debug-btn"
                  onClick={() => {
                    console.group('🧠 Tesseract Raw OCR Output');
                    console.log(ocrRawText);
                    console.groupEnd();
                    alert('Raw OCR text printed to browser console (F12 → Console).');
                  }}
                >
                  <i className="fa-solid fa-bug"></i> Debug
                </button>
              </div>
            </div>
          )}

          {ocrState === 'error' && (
            <div className="ocr-status error">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Could not read receipt. Try a clearer image.</span>
              <button type="button" className="ocr-retry-btn" onClick={handleRescan}>Retry</button>
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

          {/* Customer name combobox — only for staff/admin */}
          {!isCustomer && (
            <div className="form-group">
              <label>
                Customer Name
                {filledFields.includes('user_name') && <span className="ocr-filled-tag">OCR</span>}
              </label>
              <Combobox
                value={formData.user_name}
                onChange={({ text, item }) =>
                  setFormData(prev => ({
                    ...prev,
                    user_name: item
                      ? `${item.first_name} ${item.last_name}`.trim() || item.username
                      : text,
                  }))
                }
                options={users}
                placeholder="Type or search customer name…"
                getLabel={u => `${u.first_name} ${u.last_name}`.trim() || u.username}
                getValue={u => u.id}
              />
            </div>
          )}

          <div className="form-row">
            {/* Store combobox — type OR pick from dropdown */}
            <div className="form-group">
              <label>
                Store / Branch
                {filledFields.includes('store_name') && <span className="ocr-filled-tag">OCR</span>}
              </label>
              <Combobox
                value={formData.store_name}
                onChange={({ text, item }) =>
                  setFormData(prev => ({
                    ...prev,
                    store:      item ? String(item.id) : '',
                    store_name: item ? item.name : text,
                  }))
                }
                options={stores}
                placeholder="Type or search store…"
                getLabel={s => s.name}
                getValue={s => s.id}
              />
            </div>

            {/* Amount */}
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

          {/* Timestamp */}
          <div className="form-group">
            <label>
              Receipt Date
              {filledFields.includes('created_at') && <span className="ocr-filled-tag">OCR</span>}
            </label>
            <input
              type="datetime-local"
              name="created_at"
              value={formData.created_at}
              onChange={handleChange}
              title="Informational only — date is set automatically by the server"
            />
          </div>

          {/* Status — read-only display */}
          <div className="form-group">
            <label>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`txn-status-badge ${(formData.status || 'pending').toLowerCase()}`}>
                {formData.status || 'Pending'}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#888' }}>
                {transactionToEdit
                  ? '(use the action menu on the table to update status)'
                  : '(new transactions start as Pending automatically)'}
              </span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-inner-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn">
              {transactionToEdit ? 'Save Changes' : (isCustomer ? 'Submit for Review' : 'Record Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
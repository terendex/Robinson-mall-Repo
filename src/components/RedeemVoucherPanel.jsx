import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import SuccessModal from './SuccessModal';
import ErrorModal from './ErrorModal';
import ActionConfirmModal from './ActionConfirmModal';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const statusLabel = (s) => s === 'Approved' ? 'Claimed' : s === 'Rejected' ? 'Expired' : 'Not Claimed';
const statusColor = (s) => s === 'Approved' ? '#15803d' : s === 'Rejected' ? '#b91c1c' : '#c2410c';
const statusBg    = (s) => s === 'Approved' ? '#dcfce7' : s === 'Rejected' ? '#fee2e2' : '#fff7ed';

const QR_REGION_ID = 'redeem-qr-reader';

/**
 * RedeemVoucherPanel
 *
 * Shared component for Admin / Manager / Staff voucher pages.
 * Staff enter the customer's Claim Reference (e.g. CLAIM-5, printed on the
 * customer's QR code) to look up and confirm or reject a voucher redemption.
 * A camera button lets staff scan the QR code directly.
 */
const RedeemVoucherPanel = () => {
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'camera'
  const [redeemInput, setRedeemInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanActive, setScanActive] = useState(false);

  const html5QrRef = useRef(null);

  const [confirmConfig, setConfirmConfig] = useState({
    show: false, title: '', message: '', confirmText: '', variant: 'primary', onConfirm: () => {}
  });
  const [successConfig, setSuccessConfig] = useState({ show: false, title: '', message: '' });
  const [errorConfig, setErrorConfig]     = useState({ show: false, title: '', message: '' });

  // ── Camera lifecycle ──────────────────────────────────
  useEffect(() => {
    if (inputMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode]);

  const startCamera = async () => {
    setCameraError('');
    setScanActive(false);

    // Give the DOM a tick to render the div before attaching the scanner
    await new Promise(r => setTimeout(r, 100));

    try {
      const qr = new Html5Qrcode(QR_REGION_ID);
      html5QrRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          // decodedText is the raw QR value — normalise to "CLAIM-N" format
          const match = decodedText.match(/\d+/);
          const ref = match ? `CLAIM-${match[0]}` : decodedText;
          stopCamera();
          setInputMode('text');
          setRedeemInput(ref);
          // Auto-trigger lookup
          doLookup(ref);
        },
        () => { /* ignore per-frame errors */ }
      );
      setScanActive(true);
    } catch (err) {
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : `Camera error: ${err?.message || 'Could not start camera.'}`
      );
    }
  };

  const stopCamera = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current.clear?.();
      html5QrRef.current = null;
    }
    setScanActive(false);
  };

  // ── Lookup ────────────────────────────────────────────
  const doLookup = async (raw) => {
    if (!raw?.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await axios.get(`${BASE}/api/claims/lookup/?q=${encodeURIComponent(raw.trim())}`);
      setLookupResult(res.data);
    } catch (err) {
      setLookupError(err.response?.data?.detail || 'Claim not found. Check the reference and try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookup = () => doLookup(redeemInput);

  // ── Redeem actions ────────────────────────────────────
  const handleRedeem = async (action) => {
    if (!lookupResult) return;
    setRedeemLoading(true);
    try {
      const res = await axios.patch(`${BASE}/api/claims/${lookupResult.id}/redeem/`, { action });
      setSuccessConfig({
        show: true,
        title: action === 'approve' ? 'Redemption Successful!' : 'Claim Rejected',
        message: action === 'approve'
          ? `Voucher "${lookupResult.voucher_name}" has been successfully redeemed for ${lookupResult.user_name}.`
          : `Claim reference ${lookupResult.id} has been marked as rejected.`
      });
      setLookupResult(res.data);
    } catch (err) {
      setErrorConfig({
        show: true,
        title: 'Action Failed',
        message: err.response?.data?.detail || 'Failed to update claim status. Please try again.'
      });
    } finally {
      setRedeemLoading(false);
    }
  };

  const requestRedeemConfirm = (action) => {
    setConfirmConfig({
      show: true,
      title: action === 'approve' ? 'Confirm Redemption' : 'Confirm Rejection',
      message: `Are you sure you want to ${action === 'approve' ? 'approve' : 'reject'} this voucher claim?`,
      confirmText: action === 'approve' ? 'Confirm Redemption' : 'Reject Claim',
      variant: action === 'approve' ? 'success' : 'danger',
      onConfirm: () => handleRedeem(action)
    });
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580, margin: '0 auto', paddingTop: '1rem' }}>

      {/* Instruction banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
        padding: '1rem 1.25rem', marginBottom: '1.5rem',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      }}>
        <i className="fa-solid fa-circle-info" style={{ color: '#1d4ed8', marginTop: 2 }}></i>
        <div style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5 }}>
          <strong>How to redeem:</strong> Ask the customer to open their{' '}
          <strong>My Claims</strong> page and show the QR code.
          Scan with the <strong>camera button</strong> or manually type the{' '}
          <strong>Claim Reference</strong> (e.g.{' '}
          <code style={{ background: '#dbeafe', padding: '1px 5px', borderRadius: 4 }}>CLAIM-5</code>),
          then confirm redemption.
        </div>
      </div>

      {/* Mode toggle: Text vs Camera */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => { setInputMode('text'); setLookupResult(null); setLookupError(''); }}
          style={{
            flex: 1, padding: '0.6rem 1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.18s',
            background: inputMode === 'text' ? '#1d4ed8' : '#fff',
            color:      inputMode === 'text' ? '#fff'    : '#64748b',
            borderColor: inputMode === 'text' ? '#1d4ed8' : '#e2e8f0',
          }}
        >
          <i className="fa-solid fa-keyboard" style={{ marginRight: '0.4rem' }}></i>
          Type Reference
        </button>
        <button
          onClick={() => { setInputMode(inputMode === 'camera' ? 'text' : 'camera'); setLookupResult(null); setLookupError(''); }}
          style={{
            flex: 1, padding: '0.6rem 1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.18s',
            background: inputMode === 'camera' ? '#16a34a' : '#fff',
            color:      inputMode === 'camera' ? '#fff'    : '#64748b',
            borderColor: inputMode === 'camera' ? '#16a34a' : '#e2e8f0',
          }}
        >
          <i className="fa-solid fa-camera" style={{ marginRight: '0.4rem' }}></i>
          {inputMode === 'camera' ? 'Stop Camera' : 'Scan QR Code'}
        </button>
      </div>

      {/* ── Camera view ── */}
      {inputMode === 'camera' && (
        <div style={{ marginBottom: '1.25rem' }}>
          {cameraError ? (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem',
              display: 'flex', gap: '0.5rem', alignItems: 'center',
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {cameraError}
            </div>
          ) : (
            <div style={{
              borderRadius: 12, overflow: 'hidden', border: '2px solid #16a34a',
              background: '#000', position: 'relative',
            }}>
              {/* html5-qrcode mounts the video inside this div */}
              <div id={QR_REGION_ID} style={{ width: '100%' }} />
              {!scanActive && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.5)',
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: '#fff', fontSize: '2rem' }}></i>
                </div>
              )}
              {/* Aiming overlay */}
              {scanActive && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    width: 200, height: 200,
                    border: '3px solid #4ade80',
                    borderRadius: 12,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                  }} />
                </div>
              )}
            </div>
          )}
          {scanActive && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
              <i className="fa-solid fa-qrcode" style={{ marginRight: '0.3rem' }}></i>
              Point the camera at the customer's QR code
            </p>
          )}
        </div>
      )}

      {/* ── Text input ── */}
      {inputMode === 'text' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            value={redeemInput}
            onChange={e => { setRedeemInput(e.target.value); setLookupResult(null); setLookupError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Enter Claim Reference  (e.g. CLAIM-5)"
            style={{
              flex: 1, padding: '0.65rem 1rem', borderRadius: 8,
              border: '1.5px solid #e2e8f0', fontSize: '0.95rem',
              fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.04em',
              outline: 'none', color: '#1e293b',
            }}
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !redeemInput.trim()}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: 8, border: 'none',
              background: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: lookupLoading || !redeemInput.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              opacity: lookupLoading || !redeemInput.trim() ? 0.6 : 1,
            }}
          >
            {lookupLoading
              ? <><i className="fa-solid fa-spinner fa-spin"></i>&nbsp;Looking up…</>
              : <><i className="fa-solid fa-magnifying-glass"></i>&nbsp;Look Up</>}
          </button>
        </div>
      )}

      {/* Lookup error */}
      {lookupError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem',
          marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
        }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {lookupError}
        </div>
      )}

      {/* Claim preview card */}
      {lookupResult && (
        <div style={{
          background: '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          {/* Card header */}
          <div style={{
            background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
            padding: '1rem 1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
              <i className="fa-solid fa-receipt" style={{ marginRight: '0.4rem', color: '#c50000' }}></i>
              CLAIM-{lookupResult.id}
            </span>
            <span style={{
              fontWeight: 700, fontSize: '0.78rem', padding: '3px 10px',
              borderRadius: 999,
              background: statusBg(lookupResult.status),
              color: statusColor(lookupResult.status),
            }}>
              {statusLabel(lookupResult.status)}
            </span>
          </div>

          {/* Card body */}
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Customer', value: lookupResult.user_name || `User #${lookupResult.user}` },
                { label: 'Voucher',  value: lookupResult.voucher_name || '—' },
                { label: 'Phone',    value: lookupResult.user_phone || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Voucher Code</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#c50000', fontSize: '1rem', letterSpacing: '0.1em' }}>
                  {lookupResult.voucher_code || '—'}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {lookupResult.status === 'Pending' ? (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => requestRedeemConfirm('approve')}
                  disabled={redeemLoading}
                  style={{
                    flex: 1, padding: '0.7rem 1rem', borderRadius: 8, border: 'none',
                    background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                    cursor: redeemLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    opacity: redeemLoading ? 0.65 : 1,
                  }}
                >
                  {redeemLoading
                    ? <i className="fa-solid fa-spinner fa-spin"></i>
                    : <i className="fa-solid fa-circle-check"></i>}
                  Confirm Redemption
                </button>
                <button
                  onClick={() => requestRedeemConfirm('reject')}
                  disabled={redeemLoading}
                  style={{
                    padding: '0.7rem 1rem', borderRadius: 8,
                    border: '1.5px solid #fecaca', background: '#fff',
                    color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem',
                    cursor: redeemLoading ? 'not-allowed' : 'pointer',
                    opacity: redeemLoading ? 0.65 : 1,
                  }}
                >
                  <i className="fa-solid fa-xmark"></i> Reject
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: '0.5rem', padding: '0.75rem', borderRadius: 8, textAlign: 'center',
                fontWeight: 700, fontSize: '0.9rem',
                background: statusBg(lookupResult.status),
                color: statusColor(lookupResult.status),
              }}>
                {lookupResult.status === 'Approved'
                  ? <><i className="fa-solid fa-circle-check"></i> This voucher has already been claimed.</>
                  : <><i className="fa-solid fa-circle-xmark"></i> This voucher has been rejected/expired.</>}
              </div>
            )}
          </div>
        </div>
      )}

      <SuccessModal
        {...successConfig}
        onClose={() => setSuccessConfig(p => ({ ...p, show: false }))}
      />
      <ErrorModal
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
      <ActionConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default RedeemVoucherPanel;

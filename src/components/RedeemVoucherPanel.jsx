import React, { useState } from 'react';
import axios from 'axios';

const BASE = 'http://127.0.0.1:8000';

const statusLabel = (s) => s === 'Approved' ? 'Claimed' : s === 'Rejected' ? 'Expired' : 'Not Claimed';
const statusColor = (s) => s === 'Approved' ? '#15803d' : s === 'Rejected' ? '#b91c1c' : '#c2410c';
const statusBg = (s) => s === 'Approved' ? '#dcfce7' : s === 'Rejected' ? '#fee2e2' : '#fff7ed';

/**
 * RedeemVoucherPanel
 *
 * Shared component for Admin / Manager / Staff voucher pages.
 * Staff enter the customer's Claim Reference (e.g. CLAIM-5, printed on the
 * customer's QR code) to look up and confirm or reject a voucher redemption.
 */
const RedeemVoucherPanel = () => {
  const [redeemInput, setRedeemInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState({ type: '', text: '' });

  const handleLookup = async () => {
    const raw = redeemInput.trim();
    if (!raw) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    setRedeemMsg({ type: '', text: '' });
    try {
      const res = await axios.get(`${BASE}/api/claims/lookup/?q=${encodeURIComponent(raw)}`);
      setLookupResult(res.data);
    } catch (err) {
      setLookupError(err.response?.data?.detail || 'Claim not found. Check the reference and try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRedeem = async (action) => {
    if (!lookupResult) return;
    setRedeemLoading(true);
    try {
      const res = await axios.patch(`${BASE}/api/claims/${lookupResult.id}/redeem/`, { action });
      setRedeemMsg({
        type: 'success',
        text: action === 'approve' ? '✅ Voucher successfully redeemed!' : '❌ Voucher marked as rejected.',
      });
      setLookupResult(res.data);
    } catch (err) {
      setRedeemMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update claim.' });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: '1rem' }}>

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
          Scan or manually type the <strong>Claim Reference</strong> (e.g.{' '}
          <code style={{ background: '#dbeafe', padding: '1px 5px', borderRadius: 4 }}>CLAIM-5</code>),
          then confirm redemption.
        </div>
      </div>

      {/* Lookup input */}
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

      {/* Redeem feedback */}
      {redeemMsg.text && (
        <div style={{
          background: redeemMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${redeemMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 10, padding: '0.75rem 1rem',
          color: redeemMsg.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '0.875rem', marginBottom: '1.25rem',
        }}>
          {redeemMsg.text}
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
                { label: 'Voucher', value: lookupResult.voucher_name || '—' },
                { label: 'Phone', value: lookupResult.user_phone || '—' },
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
                  onClick={() => handleRedeem('approve')}
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
                  onClick={() => handleRedeem('reject')}
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
    </div>
  );
};

export default RedeemVoucherPanel;

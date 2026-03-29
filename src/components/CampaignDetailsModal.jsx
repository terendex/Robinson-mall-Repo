import React from 'react';
import '../styles/Modal.css';

const CampaignDetailsModal = ({ show, onClose, campaign }) => {
  if (!show || !campaign) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content user-modal details-modal scrollable-modal">
        <div className="modal-header">
          <div className="header-info-group" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <div className="header-title-complex">
              <span className="label-tiny">CAMPAIGN NAME</span>
              <h2 className="large-title">{campaign.name}</h2>
            </div>
            <div className="header-status-complex" style={{ alignItems: 'flex-start' }}>
              <span className="label-tiny">CURRENT STATUS</span>
              <span className={`campaign-badge-pill ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
            </div>
          </div>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body-padded">
          <div className="budget-summary-box">
             <div className="detail-box-refined highlight">
               <span className="label-box">TOTAL BUDGET</span>
               <span className="value-box primary">₱{Number(campaign.budget).toLocaleString()}</span>
             </div>
          </div>

          <div className="details-grid-pop-refined">
            <div className="detail-box-refined">
              <span className="label-box">START DATE</span>
              <span className="value-box">{new Date(campaign.start_date).toLocaleDateString()}</span>
            </div>
            <div className="detail-box-refined">
              <span className="label-box">END DATE</span>
              <span className="value-box">{new Date(campaign.end_date).toLocaleDateString()}</span>
            </div>
            <div className="detail-box-refined">
              <span className="label-box">REACH</span>
              <span className="value-box">{Number(campaign.reach).toLocaleString()}</span>
            </div>
            <div className="detail-box-refined">
              <span className="label-box">CONVERSIONS</span>
              <span className="value-box">{Number(campaign.conversions).toLocaleString()}</span>
            </div>
          </div>

          <div className="voucher-details-section-refined">
            <h3 className="section-title-refined">Connected Voucher</h3>
            <div className="voucher-card-mini-refined">
              <div className="v-icon-box">
                <i className="fa-solid fa-ticket"></i>
              </div>
              <div className="v-info-group">
                <div className="v-field">
                  <span className="v-label-mini">VOUCHER NAME</span>
                  <span className="v-value-mini">{campaign.voucher_name || 'N/A'}</span>
                </div>
                <div className="v-field">
                  <span className="v-label-mini">VOUCHER CODE</span>
                  <span className="v-value-mini code-red">{campaign.voucher_code || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="performance-summary-refined">
            <h3 className="section-title-refined">Performance Summary</h3>
            <p className="summary-text-refined">
              This campaign is currently <strong>{campaign.status}</strong>. 
              It has reached <strong>{Number(campaign.reach).toLocaleString()}</strong> users 
              with <strong>{Number(campaign.conversions).toLocaleString()}</strong> conversions recorded since 
              <strong> {new Date(campaign.start_date).toLocaleDateString()}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsModal;

/**
 * CampaignDetailsModal Component
 * Shows expanded details for a specific store offer with a premium, high-fidelity UI.
 */
const CampaignDetailsModal = ({ show, onClose, offer, onClaim, claiming }) => {
  if (!show || !offer) return null;

  return (
    <div className="modal-overlay modal-blur" onClick={onClose}>
      <div className="modal-content campaign-details-modal premium-details-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header-premium">
          <div className="header-badge-row">
            <span className="voucher-type-pill">{offer.voucher_type}</span>
          </div>
          <div className="header-main-row">
            <h2>{offer.name}</h2>
            <button className="close-btn-round" onClick={onClose}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="modal-body-premium">
          <div className="details-grid-refined">
            <div className="details-main-content">
              {/* Store Section */}
              <section className="info-section">
                <h4 className="section-label">
                  <i className="fa-solid fa-store"></i> Participating Store
                </h4>
                <div className="store-identity">
                  <div className="store-avatar">
                    <i className="fa-solid fa-shop"></i>
                  </div>
                  <div className="store-text">
                    <p className="store-name-bold">{offer.store_name}</p>
                    <span className="store-location">
                      <i className="fa-solid fa-location-dot"></i> Ground Floor, Robinsons Mall
                    </span>
                  </div>
                </div>
              </section>

              {/* Offer Description */}
              <section className="info-section">
                <h4 className="section-label">
                  <i className="fa-solid fa-circle-info"></i> About this Offer
                </h4>
                <div className="offer-desc-box">
                  <p>
                    Enjoy an exclusive <strong>{offer.discount_percentage}% discount</strong> on your next purchase at <strong>{offer.store_name}</strong>. 
                    This reward is part of our <strong>{offer.campaign_name}</strong> promotion, curated just for you.
                  </p>
                </div>
              </section>

              {/* Redemption Steps - Stepper Look */}
              <section className="info-section">
                <h4 className="section-label">
                  <i className="fa-solid fa-list-check"></i> Redemption Guide
                </h4>
                <div className="stepper-guide">
                  <div className="step-item-refined">
                    <div className="step-marker">
                      <div className="step-number">1</div>
                      <div className="step-line"></div>
                    </div>
                    <div className="step-content">
                      <p>Visit <strong>{offer.store_name}</strong> at their mall location.</p>
                    </div>
                  </div>
                  <div className="step-item-refined">
                    <div className="step-marker">
                      <div className="step-number">2</div>
                      <div className="step-line"></div>
                    </div>
                    <div className="step-content">
                      <p>Make a purchase and keep your official receipt.</p>
                    </div>
                  </div>
                  <div className="step-item-refined">
                    <div className="step-marker">
                      <div className="step-number">3</div>
                      <div className="step-line"></div>
                    </div>
                    <div className="step-content">
                      <p>Submit your receipt through the <strong>Transactions</strong> page.</p>
                    </div>
                  </div>
                  <div className="step-item-refined">
                    <div className="step-marker">
                      <div className="step-number">4</div>
                    </div>
                    <div className="step-content">
                      <p>Once verified, your discount will be applied automatically!</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Terms & Conditions */}
              <section className="info-section">
                <h4 className="section-label">
                  <i className="fa-solid fa-scale-balanced"></i> Terms & Conditions
                </h4>
                <ul className="terms-checklist">
                  <li><i className="fa-solid fa-check-double"></i> Valid for one-time use per customer.</li>
                  <li><i className="fa-solid fa-check-double"></i> Cannot be combined with other store promos.</li>
                  <li><i className="fa-solid fa-check-double"></i> Receipt must be clear and fully legible.</li>
                </ul>
              </section>
            </div>

            <div className="details-sidebar-refined">
              <div className="sticky-sidebar-content">
                <div className="reward-highlight-card">
                  <span className="reward-label">REWARD VALUE</span>
                  <div className="reward-value-display">
                    <span className="r-val">{offer.discount_percentage}%</span>
                    <span className="r-off">OFF</span>
                  </div>
                  <div className="reward-glow"></div>
                </div>
                
                <div className="status-info-card">
                  <div className="status-row">
                    <span className="s-label">Expires On</span>
                    <span className="s-val">{new Date(offer.campaign_end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="status-row">
                    <span className="s-label">Availability</span>
                    <span className="s-val active-status">
                      <i className="fa-solid fa-circle"></i> Active Now
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-premium">
          <button className="back-btn-minimal" onClick={onClose}>
            Back to Browse
          </button>
        </div>
      </div>
    </div>
  );
};


export default CampaignDetailsModal;


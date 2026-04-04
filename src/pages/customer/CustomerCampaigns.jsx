import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/Customer.css';

/**
 * CustomerCampaigns Component
 * Handles the UI and data logic for the CustomerCampaigns module.
 */
const CustomerCampaigns = ({ user }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/campaigns/');
        // Only show active campaigns
        setCampaigns(response.data.filter(c => c.status === 'Active'));
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const handleClaim = async (campaign) => {
    setClaiming(campaign.id);
    try {
      // Simulate scan by creating a claim directly
      await axios.post('http://127.0.0.1:8000/api/claims/', {
        user: user.id,
        voucher: campaign.voucher,
        status: 'Pending',
        receipt_no: `SCAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        amount: campaign.budget / 100, // Just a placeholder value
      });
      alert('Voucher claimed successfully! It will appear in your claims as Pending.');
    } catch (error) {
      console.error('Error claiming voucher:', error);
      alert('Failed to claim voucher. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div className="loading">Loading campaigns...</div>;

  return (
    <div className="customer-campaigns">
      <div className="customer-dashboard-header">
        <h1>Active Campaigns</h1>
        <p>Browse and claim exclusive vouchers available for you.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-tags"></i>
          <h3>No active campaigns at the moment.</h3>
          <p>Check back later for new offers!</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="customer-campaign-card">
              <div className="campaign-card-image">
                <i className={`fa-solid ${getIconForType(campaign.voucher_type)}`}></i>
              </div>
              <div className="campaign-card-content">
                <span className="campaign-card-type">{campaign.voucher_type}</span>
                <h3>{campaign.name}</h3>
                <p className="campaign-card-date">Until {new Date(campaign.end_date).toLocaleDateString()}</p>
                <div className="campaign-card-details">
                  <div className="campaign-card-discount">
                    {campaign.voucher_discount}% OFF
                  </div>
                  <button 
                    className="claim-btn" 
                    onClick={() => handleClaim(campaign)}
                    disabled={claiming === campaign.id}
                  >
                    {claiming === campaign.id ? 'Claiming...' : 'Claim Voucher'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getIconForType = (type) => {
  switch (type) {
    case 'Fashion': return 'fa-shirt';
    case 'Food & Beverage': return 'fa-utensils';
    case 'Entertainment': return 'fa-film';
    case 'Beauty': return 'fa-sparkles';
    case 'Electronics': return 'fa-laptop';
    default: return 'fa-ticket';
  }
};

export default CustomerCampaigns;

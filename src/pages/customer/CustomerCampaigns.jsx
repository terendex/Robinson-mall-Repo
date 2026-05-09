import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import '../../css/Customer.css';

const PAGE_SIZE = 8;

/**
 * CustomerCampaigns Component
 * Improved with search, category filtering, and enhanced premium UI.
 */
const CustomerCampaigns = ({ user }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Fashion', 'Food & Beverage', 'Beauty', 'Electronics', 'Grocery', 'Entertainment'];

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

  // Flatten campaigns into individual voucher offers
  const allOffers = campaigns.flatMap(campaign => 
    (campaign.vouchers || []).map(voucher => ({
      ...voucher,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      campaign_end_date: campaign.end_date,
      campaign_budget: campaign.budget
    }))
  );

  // Filter offers based on search and category
  const filteredOffers = allOffers.filter(offer => {
    const matchesSearch = offer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          offer.store_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || offer.voucher_type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredOffers.length / PAGE_SIZE);
  const pagedOffers = filteredOffers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleClaim = async (offer) => {
    setClaiming(offer.id);
    try {
      await axios.post('http://127.0.0.1:8000/api/claims/', {
        user: user.id,
        voucher: offer.id,
        status: 'Pending',
        receipt_no: `SCAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        amount: offer.campaign_budget / 100,
      });
      alert(`Voucher for ${offer.store_name} claimed successfully! Check "My Claims".`);
      setSelectedOffer(null);
    } catch (error) {
      console.error('Error claiming voucher:', error);
      alert('Failed to claim voucher. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Finding best deals for you...
    </div>
  );

  return (
    <div className="customer-campaigns">
      <div className="customer-dashboard-header campaigns-header-premium">
        <div className="header-text-content">
          <h1>Active Campaigns</h1>
          <p>Discover exclusive rewards and limited-time offers from your favorite stores.</p>
        </div>
        <div className="header-search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Search stores or offers..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      <div className="campaigns-filter-bar">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
          >
            {cat !== 'All' && <i className={`fa-solid ${getIconForType(cat)}`}></i>}
            {cat}
          </button>
        ))}
      </div>

      {filteredOffers.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-tags"></i>
          <h3>No matching offers found.</h3>
          <p>Try adjusting your search or filters to find more deals.</p>
        </div>
      ) : (
        <div className="customer-cards-container">
          <div className="campaign-grid">
            {pagedOffers.map((offer) => (
              <div key={offer.id} className="customer-campaign-card premium-voucher-card campaign-ticket animate-fade-in">
                <div className="voucher-left-accent campaign-accent"></div>
                <div className="campaign-card-content">
                  <div className="voucher-card-header">
                    <span className="voucher-type-tag">{offer.voucher_type}</span>
                    <div className="campaign-card-date">
                      <i className="fa-regular fa-clock"></i>
                      Ends {new Date(offer.campaign_end_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3>{offer.name}</h3>
                  <p className="voucher-store-loc">
                    <i className="fa-solid fa-location-dot"></i>
                    {offer.store_name}
                  </p>

                  <div className="voucher-ticket-divider">
                    <div className="cutout cutout-left"></div>
                    <div className="divider-line"></div>
                    <div className="cutout cutout-right"></div>
                  </div>

                  <div className="campaign-card-details">
                    <div className="campaign-card-discount">
                      <span className="discount-label">REWARD</span>
                      <div className="discount-row">
                        <span className="discount-value">{offer.discount_percentage}%</span>
                        <span className="discount-off">OFF</span>
                      </div>
                    </div>
                    <button 
                      className="claim-btn campaign-ticket-btn" 
                      onClick={() => setSelectedOffer(offer)}
                    >
                      View Details
                    </button>
                  </div>

                  <div className="voucher-footer">
                    <span className="promo-name-small">{offer.campaign_name}</span>
                    <div className="voucher-valid-pill promo-pill">
                      <i className="fa-solid fa-circle-check"></i> ACTIVE
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOffers.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      <CampaignDetailsModal 
        show={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
        offer={selectedOffer}
        onClaim={handleClaim}
        claiming={!!claiming}
      />
    </div>
  );
};

const getIconForType = (type) => {
  const iconMap = {
    'Fashion': 'fa-shirt',
    'Food & Beverage': 'fa-utensils',
    'Entertainment': 'fa-film',
    'Beauty': 'fa-sparkles',
    'Electronics': 'fa-laptop',
    'Home': 'fa-house',
    'Grocery': 'fa-cart-shopping'
  };
  return iconMap[type] || 'fa-ticket';
};

export default CustomerCampaigns;


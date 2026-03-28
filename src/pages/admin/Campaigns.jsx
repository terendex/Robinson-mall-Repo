import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CampaignModal from '../../components/CampaignModal';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import '../../styles/Campaigns.css';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/campaigns/');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampaign = () => {
    setCampaignToEdit(null);
    setShowModal(true);
  };

  const handleEditCampaign = (campaign) => {
    setCampaignToEdit(campaign);
    setShowModal(true);
    setActiveActions(null);
  };

  const handleDeleteCampaign = async (id) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/campaigns/${id}/`);
        setCampaigns(campaigns.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const handleSaveCampaign = async (formData) => {
    try {
      if (campaignToEdit) {
        // Update voucher if it was edited
        if (formData.voucher && (formData.voucher_name !== undefined || formData.voucher_discount !== undefined)) {
          let vName = formData.voucher_name;
          let vCode = undefined;
          if (vName && vName.includes('(') && vName.includes(')')) {
            vName = formData.voucher_name.split('(')[0].trim();
            vCode = formData.voucher_name.split('(')[1].replace(')', '').trim();
          }
          
          const patchData = {};
          if (vName) patchData.name = vName;
          if (vCode) patchData.code = vCode;
          if (formData.voucher_discount !== '') patchData.discount_percentage = parseInt(formData.voucher_discount, 10);
          
          if (Object.keys(patchData).length > 0) {
            await axios.patch(`http://127.0.0.1:8000/api/vouchers/${formData.voucher}/`, patchData);
          }
        }
        
        const response = await axios.patch(`http://127.0.0.1:8000/api/campaigns/${campaignToEdit.id}/`, formData);
        
        // Use updated campaign data, but fetch the full object again to get the fresh voucher details
        const refreshedResponse = await axios.get(`http://127.0.0.1:8000/api/campaigns/${campaignToEdit.id}/`);
        setCampaigns(campaigns.map(c => c.id === campaignToEdit.id ? refreshedResponse.data : c));
      } else {
        const response = await axios.post('http://127.0.0.1:8000/api/campaigns/', formData);
        setCampaigns([...campaigns, response.data]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Error saving campaign.');
    }
  };

  const toggleCampaignStatus = async (campaign) => {
    const nextStatusMap = {
      'Active': 'Inactive',
      'Inactive': 'Active',
      'Scheduled': 'Active',
      'Completed': 'Inactive'
    };
    const nextStatus = nextStatusMap[campaign.status] || 'Active';
    
    try {
      const response = await axios.patch(`http://127.0.0.1:8000/api/campaigns/${campaign.id}/`, {
        status: nextStatus
      });
      setCampaigns(campaigns.map(c => c.id === campaign.id ? response.data : c));
      setActiveActions(null);
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      active: campaigns.filter(c => c.status === 'Active').length,
      reach: campaigns.reduce((sum, c) => sum + (c.reach || 0), 0).toLocaleString(),
      scheduled: campaigns.filter(c => c.status === 'Scheduled').length,
    };
  }, [campaigns]);

  return (
    <div className="campaigns-page">
      <div className="campaigns-container">
        <div className="campaigns-header">
          <h1>Campaigns</h1>
          <button className="create-campaign-btn" onClick={handleAddCampaign}>
            <i className="fa-solid fa-plus"></i> Create Campaigns
          </button>
        </div>

        <div className="campaign-stats">
          <div className="campaign-stat-card">
            <div className="stat-title">
              <i className="fa-solid fa-circle active"></i>
              <span>Active Campaigns</span>
            </div>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="campaign-stat-card">
            <div className="stat-title">
              <i className="fa-solid fa-users reach"></i>
              <span>Total Reach</span>
            </div>
            <div className="stat-value">{stats.reach}</div>
          </div>
          <div className="campaign-stat-card">
            <div className="stat-title">
              <i className="fa-solid fa-calendar-days scheduled"></i>
              <span>Scheduled</span>
            </div>
            <div className="stat-value">{stats.scheduled}</div>
          </div>
        </div>

        <div className="campaigns-controls">
          <div className="campaign-search-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Search campaigns" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="campaign-filter-wrapper">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="campaign-list">
          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-card-header">
                  <div className="campaign-header-left">
                    <h3>{campaign.name}</h3>
                    <span className={`campaign-badge ${campaign.status.toLowerCase()}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="campaign-header-right">
                    <div className="header-meta-group">
                      <div className="budget-section-final">
                        <span className="budget-label-final">Budget</span>
                        <span className="budget-value-final">₱{Number(campaign.budget).toLocaleString()}</span>
                      </div>
                      <button 
                        className="card-triple-dot"
                        onClick={() => setActiveActions(activeActions === campaign.id ? null : campaign.id)}
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                    </div>
                    <button 
                      className="view-details-btn-final"
                      onClick={() => setSelectedCampaignForDetails(campaign)}
                    >
                      View Details
                    </button>
                    {activeActions === campaign.id && (
                      <div className="action-dropdown show" style={{ right: '0', top: '45px' }}>
                        <button onClick={() => handleEditCampaign(campaign)}>
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button onClick={() => toggleCampaignStatus(campaign)}>
                          <i className={`fa-solid ${campaign.status === 'Active' ? 'fa-pause' : 'fa-play'}`}></i> 
                          {campaign.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="campaign-card-content">
                  <div className="info-group">
                    <span className="info-label">Start Date</span>
                    <span className="info-value">{new Date(campaign.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="info-group">
                    <span className="info-label">End Date</span>
                    <span className="info-value">{new Date(campaign.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="info-group">
                    <span className="info-label">Reach</span>
                    <span className="info-value">{Number(campaign.reach).toLocaleString()}</span>
                  </div>
                  <div className="info-group">
                    <span className="info-label">Conversions</span>
                    <span className="info-value">{Number(campaign.conversions).toLocaleString()}</span>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      <CampaignModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveCampaign}
        campaignToEdit={campaignToEdit}
      />

      <CampaignDetailsModal 
        show={!!selectedCampaignForDetails}
        onClose={() => setSelectedCampaignForDetails(null)}
        campaign={selectedCampaignForDetails}
      />
    </div>
  );
};

export default Campaigns;

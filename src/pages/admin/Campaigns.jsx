import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import CampaignModal from '../../components/CampaignModal';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import NotificationContext from '../../context/NotificationContext';
import Pagination from '../../components/Pagination';
import Vouchers from './Vouchers';
import '../../css/Campaigns.css';
import '../../css/Transactions.css';
import '../../css/CustomerVouchers.css';


/**
 * Campaigns Component
 * Handles the UI and data logic for the Campaigns module.
 */
const PAGE_SIZE = 10;

const Campaigns = () => {
  const [pageTab, setPageTab] = useState('campaigns'); // 'campaigns' | 'vouchers'
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Status filter state
  const [statusFilters, setStatusFilters] = useState({
    Active: false,
    Completed: false,
    Scheduled: false
  });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState(null);
  
  const statusFilterRef = useRef(null);
  const actionsRef = useRef(null);
  const { addNotification } = useContext(NotificationContext);
  
  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActiveActions(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const updateCampaignStatus = async (campaign, newStatus) => {
    try {
      const response = await axios.patch(`http://127.0.0.1:8000/api/campaigns/${campaign.id}/`, {
        status: newStatus
      });
      setCampaigns(campaigns.map(c => c.id === campaign.id ? response.data : c));
      if (newStatus === 'Active') {
        addNotification({ title: response.data.name, message: `is now ${newStatus}.`, icon: 'fa-tag' });
      }
      setActiveActions(null);
    } catch (error) {
      console.error(`Error changing status to ${newStatus}:`, error);
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
        
        const refreshedResponse = await axios.get(`http://127.0.0.1:8000/api/campaigns/${campaignToEdit.id}/`);
        setCampaigns(campaigns.map(c => c.id === campaignToEdit.id ? refreshedResponse.data : c));
        addNotification({ title: refreshedResponse.data.name, message: 'has been updated.', icon: 'fa-tag' });
      } else {
        const response = await axios.post('http://127.0.0.1:8000/api/campaigns/', formData);
        setCampaigns([response.data, ...campaigns]);
        addNotification({ title: response.data.name, message: 'has been created.', icon: 'fa-plus' });
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Error saving campaign.');
    }
  };

  const handleFilterToggle = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
    setCurrentPage(1);
  };

  const filteredCampaigns = useMemo(() => {
    const isAnyStatusSelected = Object.values(statusFilters).some(v => v);
    
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (isAnyStatusSelected) {
        matchesStatus = statusFilters[c.status];
      }
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilters]);

  // Reset page when search changes
  useMemo(() => { setCurrentPage(1); }, [searchQuery]);

  // Pagination
  const totalPages     = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
  const pagedCampaigns = filteredCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      active:      campaigns.filter(c => c.status === 'Active').length,
      reach:       campaigns.reduce((sum, c) => sum + (c.reach        || 0), 0).toLocaleString(),
      scheduled:   campaigns.filter(c => c.status === 'Scheduled').length,
      conversions: campaigns.reduce((sum, c) => sum + (c.conversions  || 0), 0).toLocaleString(),
    };
  }, [campaigns]);

  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="campaigns-page">
      <div className="campaigns-container">

        {/* ── Page-level tab bar ── */}
        <div className="cv-tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`cv-tab ${pageTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setPageTab('campaigns')}
          >
            <i className="fa-solid fa-tag"></i> Campaigns
          </button>
          <button
            className={`cv-tab ${pageTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setPageTab('vouchers')}
          >
            <i className="fa-solid fa-ticket-simple"></i> Vouchers
          </button>
        </div>

        {/* ── Vouchers tab ── */}
        {pageTab === 'vouchers' && <Vouchers />}

        {/* ── Campaigns tab ── */}
        {pageTab === 'campaigns' && (
          <>
        <div className="campaigns-header">
          <h1>Campaigns</h1>
          <button className="create-campaign-btn" onClick={handleAddCampaign}>
            <i className="fa-solid fa-plus"></i> Create Campaign
          </button>
        </div>

        <div className="txn-stats">
          <div className="txn-stat-card">
            <div className="stat-title">Active Campaigns</div>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Total Reach</div>
            <div className="stat-value">{stats.reach}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Scheduled Campaigns</div>
            <div className="stat-value">{stats.scheduled}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Total Conversions</div>
            <div className="stat-value">{stats.conversions}</div>
          </div>
        </div>

        <div className="campaign-table-section">
          <div className="campaign-table-controls">
            <div className="campaign-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Search campaigns" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="status-filter-container" ref={statusFilterRef}>
              <div 
                className={`custom-filter-button ${isStatusDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <i className="fa-solid fa-filter"></i> Filter Status
              </div>
              
              {isStatusDropdownOpen && (
                <div className="custom-filter-dropdown">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={statusFilters.Active} 
                      onChange={() => handleFilterToggle('Active')} 
                    /> Active
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={statusFilters.Completed} 
                      onChange={() => handleFilterToggle('Completed')} 
                    /> Completed
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={statusFilters.Scheduled} 
                      onChange={() => handleFilterToggle('Scheduled')} 
                    /> Scheduled
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="campaign-table-wrapper">
            {loading ? (
              <div className="loading-container">
                <div className="loader"></div>
              </div>
            ) : (
              <>
                <table className="campaigns-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Vouchers</th>
                      <th>Reach</th>
                      <th>Conversions</th>
                      <th>Timeline</th>
                      <th>Budget</th>
                      <th>Spending Target</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCampaigns.length > 0 ? pagedCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="campaign-name-cell">
                          {campaign.name}
                        </td>
                        <td className="reach-cell">
                          <span className="voucher-count-badge">
                            {campaign.voucher_count ?? (campaign.vouchers?.length ?? 0)}
                          </span>
                        </td>
                        <td className="reach-cell">{Number(campaign.reach).toLocaleString()}</td>
                        <td className="conversions-cell">{Number(campaign.conversions).toLocaleString()}</td>
                        <td className="timeline-cell">
                          {formatDateLabel(campaign.start_date)} to<br />
                          {formatDateLabel(campaign.end_date)}
                        </td>
                        <td className="budget-cell">
                          ₱{Number(campaign.budget).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="budget-cell">
                          {campaign.spending_target > 0
                            ? `₱${Number(campaign.spending_target).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                            : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>— not set</span>}
                        </td>
                        <td>
                          <span className={`status-badge-new ${campaign.status.toLowerCase()}`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="actions-cell" ref={activeActions === campaign.id ? actionsRef : null}>
                          <button 
                            className="table-action-dot"
                            onClick={() => setActiveActions(activeActions === campaign.id ? null : campaign.id)}
                          >
                            <i className="fa-solid fa-ellipsis"></i>
                          </button>
                          {activeActions === campaign.id && (
                            <div className="campaign-action-dropdown show">
                              <button onClick={() => { setSelectedCampaignForDetails(campaign); setActiveActions(null); }}>
                                <i className="fa-regular fa-eye"></i> View Campaign Details
                              </button>
                              <button onClick={() => { handleEditCampaign(campaign); setActiveActions(null); }}>
                                <i className="fa-regular fa-pen-to-square"></i> Edit Campaign Details
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
                          No campaigns found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredCampaigns.length}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        </div>
        </> )}
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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import Pagination from '../../components/Pagination';
import StaffVouchers from './StaffVouchers';
import '../../css/Campaigns.css';
import '../../css/CustomerVouchers.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const PAGE_SIZE = 10;

/**
 * StaffCampaigns Component
 * Handles the UI and data logic for the StaffCampaigns module.
 */
const StaffCampaigns = () => {
  const [pageTab, setPageTab] = useState('campaigns'); // 'campaigns' | 'vouchers'
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [statusFilters, setStatusFilters] = useState({
    Active: false,
    Completed: false,
    Scheduled: false
  });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  
  const statusFilterRef = useRef(null);
  
  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE}/api/campaigns/`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterToggle = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
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

  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilters]);

  const totalPages     = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
  const pagedCampaigns = filteredCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);


  const stats = useMemo(() => {
    return {
      active: campaigns.filter(c => c.status === 'Active').length,
      reach:       campaigns.reduce((sum, c) => sum + (c.reach        || 0), 0).toLocaleString(),
      scheduled:   campaigns.filter(c => c.status === 'Scheduled').length,
      conversions: campaigns.reduce((sum, c) => sum + (c.conversions  || 0), 0).toLocaleString(),
    };
  }, [campaigns]);

  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
        {pageTab === 'vouchers' && <StaffVouchers />}

        {/* ── Campaigns tab ── */}
        {pageTab === 'campaigns' && (
          <>
        <div className="campaigns-header">
          <h1>Campaigns</h1>
        </div>

        <div className="campaign-stats">
          <div className="campaign-stat-card">
            <div className="stat-title">ACTIVE CAMPAIGNS</div>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="campaign-stat-card">
            <div className="stat-title">TOTAL REACH</div>
            <div className="stat-value">{stats.reach}</div>
          </div>
          <div className="campaign-stat-card">
            <div className="stat-title">SCHEDULED CAMPAIGNS</div>
            <div className="stat-value">{stats.scheduled}</div>
          </div>
          <div className="campaign-stat-card">
            <div className="stat-title">TOTAL CONVERSIONS</div>
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
                  {pagedCampaigns.map((campaign) => (

                    <tr key={campaign.id}>
                      <td className="campaign-name-cell">{campaign.name}</td>
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
                      <td className="actions-cell">
                        <button 
                          className="view-details-btn-new"
                          onClick={() => setSelectedCampaignForDetails(campaign)}
                        >
                          <i className="fa-regular fa-eye"></i> View details
                        </button>
                      </td>
                    </tr>
                  ))}
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

      <CampaignDetailsModal
        show={!!selectedCampaignForDetails}
        onClose={() => setSelectedCampaignForDetails(null)}
        campaign={selectedCampaignForDetails}
      />
    </div>
  );
};

export default StaffCampaigns;

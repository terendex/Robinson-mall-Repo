import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import '../../css/Campaigns.css';

/**
 * StaffCampaigns Component
 * Handles the UI and data logic for the StaffCampaigns module.
 */
const StaffCampaigns = () => {
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
      const response = await axios.get('http://127.0.0.1:8000/api/campaigns/');
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

  const stats = useMemo(() => {
    return {
      active: campaigns.filter(c => c.status === 'Active').length,
      reach: campaigns.reduce((sum, c) => sum + (c.reach || 0), 0).toLocaleString(),
      scheduled: campaigns.filter(c => c.status === 'Scheduled').length,
    };
  }, [campaigns]);

  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="campaigns-page">
      <div className="campaigns-container">
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
              <table className="campaigns-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Reach</th>
                    <th>Conversions</th>
                    <th>Timeline</th>
                    <th>Budget</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="campaign-name-cell">{campaign.name}</td>
                      <td className="reach-cell">{Number(campaign.reach).toLocaleString()}</td>
                      <td className="conversions-cell">{Number(campaign.conversions).toLocaleString()}</td>
                      <td className="timeline-cell">
                        {formatDateLabel(campaign.start_date)} to<br />
                        {formatDateLabel(campaign.end_date)}
                      </td>
                      <td className="budget-cell">₱{Number(campaign.budget).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
            )}
          </div>
        </div>
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

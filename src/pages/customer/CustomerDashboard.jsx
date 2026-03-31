import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../css/Customer.css';

const CustomerDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalClaims: 0,
    pendingClaims: 0,
    approvedRedemptions: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      try {
        const [campaignsRes, claimsRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/campaigns/'),
          axios.get(`http://127.0.0.1:8000/api/claims/?user_id=${user.id}`)
        ]);

        const activeCount = campaignsRes.data.filter(c => c.status === 'Active').length;
        const claims = claimsRes.data;
        const pendingCount = claims.filter(c => c.status === 'Pending').length;
        const approvedCount = claims.filter(c => c.status === 'Approved').length;

        setStats({
          activeCampaigns: activeCount,
          totalClaims: claims.length,
          pendingClaims: pendingCount,
          approvedRedemptions: approvedCount
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardInfo();
  }, [user.id]);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading dashboard...
    </div>
  );

  const statCards = [
    {
      label: 'Available Campaigns',
      value: stats.activeCampaigns,
      icon: 'fa-tag',
      route: '/customer/campaigns',
      color: '#cc2c2c',
      bg: '#fef2f2',
    },
    {
      label: 'Total Claims',
      value: stats.totalClaims,
      icon: 'fa-gift',
      route: '/customer/claims',
      color: '#cc2c2c',
      bg: '#fef2f2',
    },
    {
      label: 'Pending Review',
      value: stats.pendingClaims,
      icon: 'fa-clock',
      route: '/customer/claims',
      color: '#cc2c2c',
      bg: '#fef2f2',
    },
    {
      label: 'Approved Vouchers',
      value: stats.approvedRedemptions,
      icon: 'fa-ticket-simple',
      route: '/customer/vouchers',
      color: '#cc2c2c',
      bg: '#fef2f2',
    },
  ];

  return (
    <div className="customer-dashboard">
      <div className="customer-dashboard-header">
        <h1>Welcome Back, {user.first_name || user.username}! 👋</h1>
        <p>Explore the latest deals and track your rewards progress.</p>
      </div>

      <div className="customer-stats-grid">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stat-card"
            onClick={() => navigate(card.route)}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-card-icon" style={{ background: card.bg, color: card.color }}>
              <i className={`fa-solid ${card.icon}`}></i>
            </div>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value" style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-call-to-action">
        <div className="cta-icon">
          <i className="fa-solid fa-qrcode"></i>
        </div>
        <h2>Ready to Save?</h2>
        <p>Scan your receipt and claim exclusive vouchers today.</p>
        <button
          className="cta-browse-btn"
          onClick={() => navigate('/customer/campaigns')}
        >
          <i className="fa-solid fa-arrow-right" style={{ marginRight: '0.5rem' }}></i>
          Browse Offers
        </button>
      </div>
    </div>
  );
};

export default CustomerDashboard;

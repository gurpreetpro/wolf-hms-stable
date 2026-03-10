/**
 * SuperAdminDashboard.jsx
 * Enterprise Developer Dashboard for Hospital/Tenant Management
 * Wolf HMS - Multi-Tenant Administration
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosInstance';
import HospitalOnboarding from './HospitalOnboarding';
import HospitalEditForm from './HospitalEditForm';
import SetupTOTP from '../settings/SetupTOTP';
import AuditLogViewer from './AuditLogViewer';
import { APP_CONFIG, getTenantUrl } from '../../config';
import { 
    Building2, Users, Activity, Globe, Shield, 
    Server, Plus, MoreVertical, Play, Pause, 
    Box, Database, HardDrive, Cpu, LogOut, CheckCircle2,
    BarChart3, RefreshCw, XCircle
} from 'lucide-react';

const SuperAdminDashboard = () => {
    const [hospitals, setHospitals] = useState([]);
    const [healthStats, setHealthStats] = useState({});
    const [usageList, setUsageList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('fleet'); // fleet | analytics | domains | health
    
    // UI State
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [selectedLogHospital, setSelectedLogHospital] = useState(null);
    const [filter, setFilter] = useState({ status: 'all', search: '' });
    const [error, setError] = useState(null);

    // Domain editing state
    const [editingDomain, setEditingDomain] = useState(null);
    const [domainForm, setDomainForm] = useState({ subdomain: '', custom_domain: '' });
    const [domainSaving, setDomainSaving] = useState(false);

    useEffect(() => {
        fetchData();
        // Auto-refresh health stats every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchHealth = async () => {
        try {
            const res = await api.get('/api/platform/health');
            setHealthStats(res.data.data || res.data);
        } catch (e) {
            console.error('Failed to fetch health updates', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [tenantsRes, healthRes, usageRes] = await Promise.all([
                api.get('/api/platform/tenants'),
                api.get('/api/platform/health'),
                api.get('/api/platform/usage').catch(() => ({ data: { data: [] } }))
            ]);
            
            setHospitals(tenantsRes.data?.data || []);
            setHealthStats(healthRes.data?.data || {});
            setUsageList(usageRes.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load platform data');
        } finally {
            setLoading(false);
        }
    };

    // Filter hospitals
    const filteredHospitals = hospitals.filter(h => {
        const matchesStatus = filter.status === 'all' || 
            (filter.status === 'active' && h.is_active) ||
            (filter.status === 'inactive' && !h.is_active);
        const matchesSearch = !filter.search || 
            h.name?.toLowerCase().includes(filter.search.toLowerCase()) ||
            h.code?.toLowerCase().includes(filter.search.toLowerCase()) ||
            h.subdomain?.toLowerCase().includes(filter.search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Toggle hospital status
    const toggleHospitalStatus = async (id, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} this tenant?`)) return;
        try {
            await api.put('/api/platform/status', { hospital_id: id, is_active: !currentStatus });
            fetchData();
        } catch (err) {
            alert('Failed to update hospital status: ' + (err.response?.data?.message || err.message));
        }
    };

    // Teleport to Tenant
    const handleTeleport = async (hospitalId) => {
        if (!window.confirm('WARNING: You are about to assume the identity of this hospital\'s administrator. This high-privilege action will be recorded in the audit logs. Continue?')) return;
        
        try {
            const res = await api.post('/api/platform/teleport', { target_hospital_id: hospitalId });
            const { token, redirect_domain } = res.data.data;
            
            let redirectUrl;
            if (window.location.hostname === 'localhost') {
                redirectUrl = `${window.location.origin}/login?teleport_token=${token}`;
                console.log(`[DEV SIMULATION] Redirecting to localhost instead of ${redirect_domain}.${APP_CONFIG.MASTER_DOMAIN}`);
            } else {
                redirectUrl = `${APP_CONFIG.PROTOCOL}://${redirect_domain}.${APP_CONFIG.MASTER_DOMAIN}/login?teleport_token=${token}`;
            }
            
            window.open(redirectUrl, '_blank');
        } catch (err) {
            console.error('Teleport failed:', err);
            alert('Teleport failed: ' + (err.response?.data?.message || err.message));
        }
    };

    // Save Domain Edit
    const saveDomain = async (id) => {
        setDomainSaving(true);
        try {
            await api.put(`/api/platform/tenants/${id}/domain`, domainForm);
            setEditingDomain(null);
            fetchData();
        } catch (err) {
            alert('Failed to update domain: ' + (err.response?.data?.message || err.message));
        } finally {
            setDomainSaving(false);
        }
    };

    // Glassmorphism System Styles
    const glassPanel = {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
        color: '#f8fafc'
    };
    
    const glassCard = {
        ...glassPanel,
        borderRadius: '16px',
        padding: '24px',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
    };

    const gradientText = {
        background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block'
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading Command Center...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%)', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
            {/* Top Navigation Bar */}
            <div style={{ ...glassPanel, borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '10px', borderRadius: '12px' }}>
                            <Box size={24} color="white" />
                        </div>
                        <div>
                            <h4 className="mb-0 fw-bold" style={gradientText}>Wolf OS Command Center</h4>
                            <p className="mb-0 text-muted small d-flex align-items-center gap-2">
                                Platform Version 2.0.4 • {APP_CONFIG.MASTER_DOMAIN}
                                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 ms-2">
                                    <span style={{ display: 'inline-block', width: 6, height: 6, background: '#10b981', borderRadius: '50%', marginRight: 6, animation: 'pulse 2s infinite' }}></span>
                                    ALL SYSTEMS NORMAL
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="d-flex gap-3">
                        <button 
                            className="btn btn-dark border border-secondary text-light d-flex align-items-center gap-2"
                            style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}
                            onClick={() => window.location.href = '/admin/vault'}
                        >
                            <Shield size={18} className="text-info" /> Platform Vault
                        </button>
                        <button 
                            className="btn btn-primary d-flex align-items-center gap-2 fw-semibold"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '10px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
                            onClick={() => setShowOnboarding(true)}
                        >
                            <Plus size={18} /> Deploy Tenant
                        </button>
                    </div>
                </div>
            </div>

            <div className="container-fluid px-4 py-4 mt-2">
                {error && (
                    <div className="alert alert-danger d-flex align-items-center mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                        <XCircle className="me-3" size={24} />
                        <div className="flex-grow-1">{error}</div>
                        <button className="btn btn-outline-danger btn-sm" onClick={fetchData}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                )}

                {/* KPI Cards Row */}
                <div className="row g-4 mb-5">
                    <div className="col-12 col-md-6 col-lg-3">
                        <div style={glassCard} className="position-relative overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <p className="text-secondary mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Fleet Size</p>
                                    <h2 className="display-5 fw-bold mb-0">{healthStats?.total_hospitals || 0}</h2>
                                </div>
                                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <Building2 size={28} className="text-info" />
                                </div>
                            </div>
                            <div className="d-flex align-items-center text-muted small gap-2 mt-3">
                                <span className="text-success fw-medium"><CheckCircle2 size={14} className="me-1"/> {hospitals.filter(h => h.is_active).length} Active</span>
                                <span className="mx-2">•</span>
                                <span>{hospitals.filter(h => !h.is_active).length} Suspended</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: '100%', background: 'linear-gradient(90deg, #38bdf8, transparent)' }} />
                        </div>
                    </div>
                    
                    <div className="col-12 col-md-6 col-lg-3">
                        <div style={glassCard} className="position-relative overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <p className="text-secondary mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Total Reach</p>
                                    <h2 className="display-5 fw-bold mb-0">{healthStats?.total_patients || 0}</h2>
                                </div>
                                <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <Users size={28} style={{ color: '#a78bfa' }} />
                                </div>
                            </div>
                            <div className="d-flex align-items-center text-muted small mt-3">
                                <span>Across {(healthStats?.total_users || 0)} registered staff members</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: '100%', background: 'linear-gradient(90deg, #a78bfa, transparent)' }} />
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                        <div style={glassCard} className="position-relative overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <p className="text-secondary mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Active Connections</p>
                                    <h2 className="display-5 fw-bold mb-0">{healthStats?.db_connections || 0}</h2>
                                </div>
                                <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <Database size={28} className="text-warning" />
                                </div>
                            </div>
                            <div className="d-flex align-items-center text-muted small mt-3">
                                <span>PostgreSQL Cluster Pool Utilization</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: '100%', background: 'linear-gradient(90deg, #facc15, transparent)' }} />
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                        <div style={glassCard} className="position-relative overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <p className="text-secondary mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Server Uptime</p>
                                    <h2 className="display-5 fw-bold mb-0">
                                        {healthStats?.server_uptime ? Math.floor(healthStats.server_uptime / 3600) : 0}<span className="fs-5 text-muted ms-1">hrs</span>
                                    </h2>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                    <Activity size={28} className="text-success" />
                                </div>
                            </div>
                            <div className="d-flex align-items-center text-muted small mt-3">
                                <span className="text-success">Node.js Engine Stable</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: '100%', background: 'linear-gradient(90deg, #10b981, transparent)' }} />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ ...glassPanel, borderRadius: '16px', overflow: 'hidden' }}>
                    {/* Dark Tabs Header */}
                    <div className="d-flex align-items-center px-4 py-3" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '8px' }}>
                        {[
                            { id: 'fleet', icon: Building2, label: 'Fleet Overview' },
                            { id: 'analytics', icon: BarChart3, label: 'Tenant Analytics' },
                            { id: 'domains', icon: Globe, label: 'Domain Management' },
                            { id: 'health', icon: Server, label: 'System Health' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`btn d-flex align-items-center gap-2 px-4 py-2 fw-medium transition-all ${activeTab === t.id ? 'text-white' : 'text-secondary'}`}
                                style={{ 
                                    background: activeTab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <t.icon size={18} className={activeTab === t.id ? 'text-info' : 'text-muted'} /> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">
                        {/* TAB 1: FLEET OVERVIEW */}
                        {activeTab === 'fleet' && (
                            <div>
                                <div className="d-flex mb-4 gap-3 align-items-center">
                                    <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                                        <i className="bi bi-search position-absolute text-secondary" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }}></i>
                                        <input 
                                            type="text" 
                                            className="form-control bg-dark text-light border-secondary shadow-none" 
                                            placeholder="Search tenants by name, code, or domain..."
                                            value={filter.search}
                                            onChange={(e) => setFilter({...filter, search: e.target.value})}
                                            style={{ paddingLeft: '45px', borderRadius: '12px' }}
                                        />
                                    </div>
                                    <select 
                                        className="form-select text-light"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', width: 'auto' }}
                                        value={filter.status}
                                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                                    >
                                        <option value="all">All States</option>
                                        <option value="active">Active Running</option>
                                        <option value="inactive">Suspended</option>
                                    </select>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr className="text-secondary small text-uppercase" style={{ letterSpacing: '1px' }}>
                                                <th className="border-0 rounded-start">Tenant Identification</th>
                                                <th className="border-0">Tier</th>
                                                <th className="border-0 text-center">Users</th>
                                                <th className="border-0 text-center">Patients</th>
                                                <th className="border-0">State</th>
                                                <th className="border-0 text-end rounded-end">Platform Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHospitals.map(h => (
                                                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td className="py-3">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="d-flex justify-content-center align-items-center fw-bold fs-5 shadow-sm rounded-3" 
                                                                style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #334155, #1e293b)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                {h.name?.charAt(0) || 'T'}
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-1 text-light fw-semibold">{h.name}</h6>
                                                                <div className="d-flex gap-2 align-items-center">
                                                                    <span className="badge bg-dark border border-secondary text-muted rounded-pill px-2 py-1">
                                                                        {h.code}
                                                                    </span>
                                                                    <a href={getTenantUrl(h.subdomain)} className="text-info text-decoration-none small" target="_blank" rel="noreferrer">
                                                                        {h.subdomain}.{APP_CONFIG.MASTER_DOMAIN} ↗
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge rounded-pill px-3 py-2 bg-opacity-10 border ${
                                                            h.subscription_tier === 'enterprise' ? 'bg-warning text-warning border-warning' : 
                                                            h.subscription_tier === 'professional' ? 'bg-primary text-primary border-primary' : 
                                                            'bg-secondary text-secondary border-secondary'}`}
                                                        >
                                                            {h.subscription_tier?.toUpperCase() || 'STANDARD'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center fw-medium">{h.user_count}</td>
                                                    <td className="text-center fw-medium text-info">{h.patient_count}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.is_active ? '#10b981' : '#ef4444' }}></div>
                                                            <span className={h.is_active ? 'text-success fw-medium' : 'text-danger fw-medium'}>
                                                                {h.is_active ? 'ONLINE' : 'SUSPENDED'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="btn-group border border-secondary rounded overflow-hidden">
                                                            <button 
                                                                className="btn btn-sm btn-dark text-info border-end border-secondary hover-bg-primary"
                                                                onClick={() => handleTeleport(h.id)}
                                                                title="Override Login (Teleport)"
                                                                style={{ background: 'rgba(0,0,0,0.3)' }}
                                                            >
                                                                <LogOut size={16} />
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-dark text-warning border-end border-secondary"
                                                                onClick={() => setSelectedLogHospital(h)}
                                                                title="Audit Trail"
                                                                style={{ background: 'rgba(0,0,0,0.3)' }}
                                                            >
                                                                <Shield size={16} />
                                                            </button>
                                                            <button 
                                                                className={`btn btn-sm btn-dark ${h.is_active ? 'text-danger' : 'text-success'}`}
                                                                onClick={() => toggleHospitalStatus(h.id, h.is_active)}
                                                                title={h.is_active ? 'Halt Operations' : 'Resume Operations'}
                                                                style={{ background: 'rgba(0,0,0,0.3)' }}
                                                            >
                                                                {h.is_active ? <Pause size={16} /> : <Play size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredHospitals.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-5 text-muted">
                                                        <Building2 size={48} className="mb-3 opacity-25" />
                                                        <p>No tenant records match your criteria.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ANALYTICS */}
                        {activeTab === 'analytics' && (
                            <div className="py-2">
                                <h4 className="mb-4 text-light fw-bold">Platform Usage Metrics</h4>
                                <div className="row g-4">
                                    {usageList.map(u => (
                                        <div key={u.id} className="col-12 col-md-6">
                                            <div className="p-4 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="d-flex justify-content-between mb-3">
                                                    <h5 className="mb-0 text-info fw-bold">{u.name}</h5>
                                                    <span className="text-muted small">ID: {String(u.id).substring(0,8)}</span>
                                                </div>
                                                <div className="row text-center mt-4">
                                                    <div className="col border-end border-secondary border-opacity-25">
                                                        <div className="fs-3 fw-light text-light">{u.patient_count}</div>
                                                        <div className="text-muted small text-uppercase">Patients</div>
                                                    </div>
                                                    <div className="col border-end border-secondary border-opacity-25">
                                                        <div className="fs-3 fw-light text-light">{u.appointments_30d || 0}</div>
                                                        <div className="text-muted small text-uppercase">Appts (30d)</div>
                                                    </div>
                                                    <div className="col">
                                                        <div className="fs-3 fw-light text-success">{u.invoices_30d || 0}</div>
                                                        <div className="text-muted small text-uppercase">Invoices (30d)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {usageList.length === 0 && (
                                        <div className="col-12 text-center text-muted py-5">
                                            <BarChart3 size={48} className="opacity-25 mb-3" />
                                            <p>No usage data aggregated yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: DOMAINS */}
                        {activeTab === 'domains' && (
                            <div className="py-2">
                                <h4 className="mb-4 text-light fw-bold">Domain Binding Engine</h4>
                                <div className="table-responsive">
                                    <table className="table table-dark align-middle" style={{ background: 'transparent' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr className="text-secondary small text-uppercase border-bottom border-secondary">
                                                <th className="border-0">Tenant</th>
                                                <th className="border-0">Platform Subdomain</th>
                                                <th className="border-0">Custom Ext. Domain</th>
                                                <th className="border-0 text-end">Binding Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hospitals.map(h => (
                                                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td className="fw-medium text-light">{h.name}</td>
                                                    <td>
                                                        {editingDomain === h.id ? (
                                                            <>
                                                                <div className="input-group input-group-sm mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control form-control-sm bg-dark text-light border-secondary"
                                                                        placeholder="Subdomain"
                                                                        value={domainForm.subdomain}
                                                                        onChange={e => setDomainForm({...domainForm, subdomain: e.target.value})}
                                                                    />
                                                                    <span className="input-group-text bg-dark text-secondary border-secondary px-2">.{APP_CONFIG.MASTER_DOMAIN}</span>
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control form-control-sm bg-dark text-light border-secondary"
                                                                    placeholder="Custom Domain (optional)"
                                                                    value={domainForm.custom_domain}
                                                                    onChange={e => setDomainForm({...domainForm, custom_domain: e.target.value})}
                                                                />
                                                            </>
                                                        ) : (
                                                            <span className="text-info">{h.subdomain}.{APP_CONFIG.MASTER_DOMAIN}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {editingDomain === h.id ? (
                                                            <input 
                                                                type="text" 
                                                                className="form-control form-control-sm bg-dark text-light border-secondary" 
                                                                placeholder="e.g. hms.clinic.com"
                                                                value={domainForm.custom_domain}
                                                                onChange={e => setDomainForm({...domainForm, custom_domain: e.target.value})}
                                                            />
                                                        ) : (
                                                            <span className={h.custom_domain ? 'text-success' : 'text-muted'}>
                                                                {h.custom_domain || 'Unbound'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        {editingDomain === h.id ? (
                                                            <div className="btn-group">
                                                                <button className="btn btn-sm btn-success" onClick={() => saveDomain(h.id)} disabled={domainSaving}>Save</button>
                                                                <button className="btn btn-sm btn-secondary" onClick={() => setEditingDomain(null)}>Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                className="btn btn-sm btn-outline-secondary text-light"
                                                                onClick={() => {
                                                                    setDomainForm({ subdomain: h.subdomain || '', custom_domain: h.custom_domain || '' });
                                                                    setEditingDomain(h.id);
                                                                }}
                                                            >
                                                                Reconfigure
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: HEALTH */}
                        {activeTab === 'health' && (
                            <div className="py-2">
                                <h4 className="mb-4 text-light fw-bold">Live System Telemetry</h4>
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="p-4 rounded h-100" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h5 className="d-flex align-items-center gap-2 mb-4 text-muted"><Cpu size={20} /> Compute Engine</h5>
                                            <div className="mb-4">
                                                <div className="d-flex justify-content-between text-light mb-1">
                                                    <span>Core Load Avg (1m, 5m, 15m)</span>
                                                    <span className="fw-bold text-info">
                                                        {healthStats?.system_load_avg ? healthStats.system_load_avg.map(n => n.toFixed(2)).join(' | ') : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="d-flex justify-content-between text-light mb-1">
                                                    <span>Node V8 Heap Utilization</span>
                                                    <span className="fw-bold text-warning">
                                                        {healthStats?.memory_usage ? Math.round(healthStats.memory_usage.heapUsed / 1024 / 1024) : 0} MB / 
                                                        {healthStats?.memory_usage ? Math.round(healthStats.memory_usage.heapTotal / 1024 / 1024) : 0} MB
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-4 rounded h-100" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h5 className="d-flex align-items-center gap-2 mb-4 text-muted"><HardDrive size={20} /> Subsystems</h5>
                                            <div className="d-flex justify-content-between text-light mb-3 pb-3 border-bottom border-secondary border-opacity-25">
                                                <span>Postgres DB Cluster</span>
                                                <span className="badge bg-success bg-opacity-25 text-success border border-success">ONLINE</span>
                                            </div>
                                            <div className="d-flex justify-content-between text-light mb-3 pb-3 border-bottom border-secondary border-opacity-25">
                                                <span>LiveKit WebRTC SFU</span>
                                                <span className="badge bg-success bg-opacity-25 text-success border border-success">PORT 7880 OK</span>
                                            </div>
                                            <div className="d-flex justify-content-between text-light">
                                                <span>Worker API Gateways</span>
                                                <span className="badge bg-success bg-opacity-25 text-success border border-success">{healthStats?.active_requests_rpm || 0} RPM</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals with Glassmorphism Overlay */}
            {showOnboarding && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content shadow-lg" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div data-bs-theme="dark">
                                <HospitalOnboarding 
                                    onComplete={() => { setShowOnboarding(false); fetchData(); }}
                                    onCancel={() => setShowOnboarding(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedLogHospital && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content shadow-lg h-100" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                           <AuditLogViewer
                                hospitalId={selectedLogHospital.id}
                                hospitalName={selectedLogHospital.name}
                                onClose={() => setSelectedLogHospital(null)}
                           />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SearchIcon = ({ size, style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

export default SuperAdminDashboard;

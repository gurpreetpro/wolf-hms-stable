/**
 * Home Collection Dashboard Component
 * 
 * Admin dashboard for monitoring home lab collection operations
 * Shows phlebotomist locations, sample journey, and stats
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const HomeCollectionDashboard = () => {
    const [stats, setStats] = useState({
        today_collections: 0,
        pending: 0,
        in_transit: 0,
        completed_today: 0,
        active_phlebotomists: 0
    });
    const [phlebotomists, setPhlebotomists] = useState([]);
    const [samples, setSamples] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedSample, setSelectedSample] = useState(null);
    const [showSampleModal, setShowSampleModal] = useState(false);

    useEffect(() => {
        fetchDashboard();
        fetchPhlebotomists();
        fetchSamples();
        fetchPackages();
        
        // Refresh phlebotomist locations every 30 seconds
        const interval = setInterval(fetchPhlebotomists, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/home-lab/dashboard`);
            const data = await res.json();
            setStats(data.stats || {});
        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPhlebotomists = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/home-lab/phlebotomists`);
            const data = await res.json();
            setPhlebotomists(data.phlebotomists || []);
        } catch (err) {
            console.error('Failed to fetch phlebotomists:', err);
        }
    };

    const fetchSamples = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/home-lab/samples?limit=50`);
            const data = await res.json();
            setSamples(data.samples || []);
        } catch (err) {
            console.error('Failed to fetch samples:', err);
        }
    };

    const fetchPackages = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/home-lab/packages`);
            const data = await res.json();
            setPackages(data.packages || []);
        } catch (err) {
            console.error('Failed to fetch packages:', err);
        }
    };

    const updateSampleStatus = async (sampleId, newStatus) => {
        try {
            await fetch(`${API_BASE}/api/home-lab/samples/${sampleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchSamples();
            fetchDashboard();
            setShowSampleModal(false);
        } catch (err) {
            console.error('Failed to update sample:', err);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'scheduled': '#6b7280',
            'en_route': '#f59e0b',
            'collecting': '#0ea5e9',
            'collected': '#8b5cf6',
            'in_transit': '#f59e0b',
            'received_at_lab': '#14b8a6',
            'processing': '#0ea5e9',
            'completed': '#10b981',
            'cancelled': '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'scheduled': '📅 Scheduled',
            'en_route': '🚗 En Route',
            'collecting': '🩸 Collecting',
            'collected': '✅ Collected',
            'in_transit': '🚐 In Transit',
            'received_at_lab': '🏥 At Lab',
            'processing': '🔬 Processing',
            'completed': '✅ Completed',
            'cancelled': '❌ Cancelled'
        };
        return labels[status] || status;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e1e2f', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🏠 Home Lab Collection
                </h1>
                <p style={{ color: '#888', margin: '8px 0 0' }}>
                    Monitor phlebotomists, sample journeys, and test packages
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📋</div>
                    <div style={styles.statValue}>{stats.today_collections}</div>
                    <div style={styles.statLabel}>Today's Collections</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⏳</div>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.pending}</div>
                    <div style={styles.statLabel}>Pending</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🚐</div>
                    <div style={{ ...styles.statValue, color: '#0ea5e9' }}>{stats.in_transit}</div>
                    <div style={styles.statLabel}>In Transit</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>✅</div>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.completed_today}</div>
                    <div style={styles.statLabel}>Completed Today</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👨‍⚕️</div>
                    <div style={styles.statValue}>{stats.active_phlebotomists}</div>
                    <div style={styles.statLabel}>Active Staff</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['overview', 'samples', 'staff', 'packages'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === tab ? '#14b8a6' : '#2a2a3d'
                        }}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={styles.contentCard}>
                {activeTab === 'overview' && (
                    <div>
                        <h3 style={{ color: '#fff', marginTop: 0 }}>🗺️ Live Phlebotomist Map</h3>
                        <div style={styles.mapPlaceholder}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
                            <p style={{ color: '#888', margin: 0 }}>
                                Live location tracking for {phlebotomists.length} active staff
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px', justifyContent: 'center' }}>
                                {phlebotomists.map(p => (
                                    <div key={p.user_id} style={styles.staffCard}>
                                        <div style={styles.onlineIndicator}></div>
                                        <span style={{ fontWeight: '500' }}>{p.full_name || p.username}</span>
                                        <span style={{ color: '#888', fontSize: '12px' }}>
                                            {p.active_jobs} jobs | 🔋 {p.battery_percent || 'N/A'}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'samples' && (
                    <div>
                        <h3 style={{ color: '#fff', marginTop: 0 }}>📦 Sample Journey Tracker</h3>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Sample ID</th>
                                    <th style={styles.th}>Patient</th>
                                    <th style={styles.th}>Phlebotomist</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Created</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {samples.length === 0 ? (
                                    <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}>No samples yet</td></tr>
                                ) : (
                                    samples.map(sample => (
                                        <tr key={sample.id} style={{ borderBottom: '1px solid #3a3a4d' }}>
                                            <td style={styles.td}>
                                                <span style={{ fontFamily: 'monospace', color: '#14b8a6' }}>
                                                    {sample.sample_id || `#${sample.id}`}
                                                </span>
                                            </td>
                                            <td style={styles.td}>{sample.patient_name || 'Unknown'}</td>
                                            <td style={styles.td}>{sample.phlebotomist_name || '-'}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    backgroundColor: getStatusColor(sample.current_status),
                                                    color: '#fff'
                                                }}>
                                                    {getStatusLabel(sample.current_status)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>{formatTime(sample.created_at)}</td>
                                            <td style={styles.td}>
                                                <button 
                                                    onClick={() => { setSelectedSample(sample); setShowSampleModal(true); }}
                                                    style={styles.actionButton}
                                                >
                                                    View Journey
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div>
                        <h3 style={{ color: '#fff', marginTop: 0 }}>👨‍⚕️ Phlebotomist Status</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {phlebotomists.length === 0 ? (
                                <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px', color: '#888' }}>
                                    No active phlebotomists online
                                </div>
                            ) : (
                                phlebotomists.map(staff => (
                                    <div key={staff.user_id} style={styles.staffDetailCard}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={styles.staffAvatar}>
                                                👨‍⚕️
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#fff' }}>
                                                    {staff.full_name || staff.username}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#888' }}>
                                                    📞 {staff.phone || 'N/A'}
                                                </div>
                                            </div>
                                            <div style={{
                                                ...styles.onlineBadge,
                                                backgroundColor: staff.is_online ? '#10b981' : '#6b7280'
                                            }}>
                                                {staff.is_online ? 'Online' : 'Offline'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#888' }}>
                                            <span>📍 Lat: {staff.latitude?.toFixed(4) || '-'}</span>
                                            <span>🔋 {staff.battery_percent || '-'}%</span>
                                            <span>📋 {staff.active_jobs} active</span>
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                                            Last updated: {formatTime(staff.last_updated)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'packages' && (
                    <div>
                        <h3 style={{ color: '#fff', marginTop: 0 }}>🧪 Test Packages</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {packages.map(pkg => (
                                <div key={pkg.id} style={styles.packageCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '32px' }}>{pkg.icon}</div>
                                        {pkg.is_popular && (
                                            <span style={styles.popularBadge}>🔥 Popular</span>
                                        )}
                                    </div>
                                    <h4 style={{ color: '#fff', margin: '12px 0 4px' }}>{pkg.name}</h4>
                                    <p style={{ color: '#888', fontSize: '13px', margin: '0 0 12px' }}>
                                        {pkg.description}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#14b8a6' }}>
                                            ₹{pkg.discounted_price}
                                        </span>
                                        <span style={{ textDecoration: 'line-through', color: '#666' }}>
                                            ₹{pkg.original_price}
                                        </span>
                                        <span style={{ color: '#10b981', fontSize: '13px' }}>
                                            {pkg.discount_percent}% off
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                                        Tests: {pkg.included_tests?.join(', ') || 'N/A'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sample Journey Modal */}
            {showSampleModal && selectedSample && (
                <div style={styles.modalOverlay} onClick={() => setShowSampleModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0, color: '#fff' }}>
                                📦 Sample Journey: {selectedSample.sample_id || `#${selectedSample.id}`}
                            </h2>
                            <button onClick={() => setShowSampleModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={styles.label}>Patient</label>
                                    <div style={{ color: '#fff' }}>{selectedSample.patient_name}</div>
                                </div>
                                <div>
                                    <label style={styles.label}>Phlebotomist</label>
                                    <div style={{ color: '#fff' }}>{selectedSample.phlebotomist_name || 'Not assigned'}</div>
                                </div>
                            </div>
                            
                            <h4 style={{ color: '#fff', marginBottom: '12px' }}>Status Timeline</h4>
                            <div style={styles.timeline}>
                                {(selectedSample.status_history || []).map((status, idx) => (
                                    <div key={idx} style={styles.timelineItem}>
                                        <div style={{
                                            ...styles.timelineDot,
                                            backgroundColor: getStatusColor(status.status)
                                        }}></div>
                                        <div>
                                            <div style={{ color: '#fff' }}>{getStatusLabel(status.status)}</div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>
                                                {formatTime(status.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div style={styles.timelineItem}>
                                    <div style={{
                                        ...styles.timelineDot,
                                        backgroundColor: getStatusColor(selectedSample.current_status)
                                    }}></div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: '600' }}>
                                            Current: {getStatusLabel(selectedSample.current_status)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ color: '#fff', margin: '20px 0 12px' }}>Update Status</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['en_route', 'collecting', 'collected', 'in_transit', 'received_at_lab', 'processing', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => updateSampleStatus(selectedSample.id, status)}
                                        disabled={selectedSample.current_status === status}
                                        style={{
                                            ...styles.statusButton,
                                            backgroundColor: getStatusColor(status),
                                            opacity: selectedSample.current_status === status ? 0.5 : 1
                                        }}
                                    >
                                        {getStatusLabel(status)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    statCard: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
    },
    statIcon: { fontSize: '28px', marginBottom: '8px' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#14b8a6' },
    statLabel: { fontSize: '14px', color: '#888', marginTop: '4px' },
    tabButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    contentCard: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        padding: '20px'
    },
    mapPlaceholder: {
        backgroundColor: '#1e1e2f',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        minHeight: '300px'
    },
    staffCard: {
        backgroundColor: '#2a2a3d',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#fff'
    },
    onlineIndicator: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#10b981'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        textAlign: 'left',
        padding: '12px',
        backgroundColor: '#1e1e2f',
        color: '#888',
        fontWeight: '500',
        fontSize: '13px'
    },
    td: { padding: '12px', color: '#ccc', fontSize: '14px' },
    actionButton: {
        padding: '6px 12px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    staffDetailCard: {
        backgroundColor: '#1e1e2f',
        borderRadius: '12px',
        padding: '16px'
    },
    staffAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#3a3a4d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
    },
    onlineBadge: {
        marginLeft: 'auto',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        color: '#fff'
    },
    packageCard: {
        backgroundColor: '#1e1e2f',
        borderRadius: '12px',
        padding: '20px'
    },
    popularBadge: {
        padding: '4px 8px',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#ef4444'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#2a2a3d',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #3a3a4d'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '28px',
        cursor: 'pointer'
    },
    modalBody: { padding: '20px' },
    label: { display: 'block', color: '#888', marginBottom: '4px', fontSize: '12px' },
    timeline: { 
        paddingLeft: '20px', 
        borderLeft: '2px solid #3a3a4d' 
    },
    timelineItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px',
        position: 'relative'
    },
    timelineDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        position: 'absolute',
        left: '-27px'
    },
    statusButton: {
        padding: '8px 14px',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    }
};

export default HomeCollectionDashboard;

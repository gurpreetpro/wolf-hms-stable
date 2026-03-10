/**
 * Doctor Reviews Admin Panel
 * 
 * Admin interface for viewing and moderating doctor reviews
 * Supports Wolf Care patient app review functionality
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const DoctorReviewsPanel = () => {
    const [reviews, setReviews] = useState([]);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending'
    const [selectedReview, setSelectedReview] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, avgRating: 0, pending: 0 });

    useEffect(() => {
        fetchDoctors();
        fetchReviews();
        fetchPendingReviews();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            fetchReviews(selectedDoctor);
        }
    }, [selectedDoctor]);

    const fetchDoctors = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/users?role=doctor`);
            const data = await res.json();
            setDoctors(data.users || data || []);
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
        }
    };

    const fetchReviews = async (doctorId = '') => {
        try {
            setLoading(true);
            const url = doctorId 
                ? `${API_BASE}/api/reviews/all?doctor_id=${doctorId}&limit=100`
                : `${API_BASE}/api/reviews/all?limit=100`;
            const res = await fetch(url);
            const data = await res.json();
            setReviews(data.reviews || []);
            
            // Calculate stats
            const activeReviews = (data.reviews || []).filter(r => r.status === 'active');
            const avgRating = activeReviews.length > 0 
                ? (activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length).toFixed(1)
                : 0;
            setStats(prev => ({ 
                ...prev, 
                total: activeReviews.length, 
                avgRating 
            }));
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingReviews = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/reviews/pending`);
            const data = await res.json();
            setPendingReviews(data.reviews || []);
            setStats(prev => ({ ...prev, pending: (data.reviews || []).length }));
        } catch (err) {
            console.error('Failed to fetch pending reviews:', err);
        }
    };

    const handleModerate = async (action) => {
        if (!selectedReview) return;
        
        try {
            const res = await fetch(`${API_BASE}/api/reviews/${selectedReview.id}/moderate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action, 
                    admin_notes: document.getElementById('adminNotes')?.value || '' 
                })
            });
            
            if (res.ok) {
                setShowModal(false);
                setSelectedReview(null);
                fetchReviews(selectedDoctor);
                fetchPendingReviews();
            }
        } catch (err) {
            console.error('Failed to moderate review:', err);
        }
    };

    const renderStars = (rating) => {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    };

    const getStatusBadge = (status) => {
        const colors = {
            active: { bg: '#10b981', label: 'Active' },
            reported: { bg: '#f59e0b', label: 'Reported' },
            hidden: { bg: '#6b7280', label: 'Hidden' },
            deleted: { bg: '#ef4444', label: 'Deleted' }
        };
        const style = colors[status] || colors.active;
        return (
            <span style={{ 
                backgroundColor: style.bg, 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '4px',
                fontSize: '12px'
            }}>
                {style.label}
            </span>
        );
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e1e2f', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ⭐ Doctor Reviews Dashboard
                </h1>
                <p style={{ color: '#888', margin: '8px 0 0' }}>
                    Manage and moderate reviews from Wolf Care patient app
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⭐</div>
                    <div style={styles.statValue}>{stats.avgRating}</div>
                    <div style={styles.statLabel}>Avg Rating</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📝</div>
                    <div style={styles.statValue}>{stats.total}</div>
                    <div style={styles.statLabel}>Total Reviews</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⚠️</div>
                    <div style={{ ...styles.statValue, color: stats.pending > 0 ? '#f59e0b' : '#10b981' }}>
                        {stats.pending}
                    </div>
                    <div style={styles.statLabel}>Pending Moderation</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👨‍⚕️</div>
                    <div style={styles.statValue}>{doctors.length}</div>
                    <div style={styles.statLabel}>Doctors</div>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px' 
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setActiveTab('all')}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === 'all' ? '#14b8a6' : '#2a2a3d'
                        }}
                    >
                        All Reviews
                    </button>
                    <button 
                        onClick={() => setActiveTab('pending')}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === 'pending' ? '#f59e0b' : '#2a2a3d'
                        }}
                    >
                        Pending ({stats.pending})
                    </button>
                </div>
                
                <select 
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    style={styles.select}
                >
                    <option value="">All Doctors</option>
                    {doctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                            {doc.username || doc.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Reviews Table */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Rating</th>
                            <th style={styles.th}>Review</th>
                            <th style={styles.th}>Doctor</th>
                            <th style={styles.th}>Patient</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ ...styles.td, textAlign: 'center' }}>
                                    Loading...
                                </td>
                            </tr>
                        ) : (activeTab === 'all' ? reviews : pendingReviews).length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ ...styles.td, textAlign: 'center' }}>
                                    No reviews found
                                </td>
                            </tr>
                        ) : (
                            (activeTab === 'all' ? reviews : pendingReviews).map(review => (
                                <tr key={review.id} style={{ borderBottom: '1px solid #3a3a4d' }}>
                                    <td style={styles.td}>
                                        <span style={{ color: '#fcd34d', fontSize: '16px' }}>
                                            {renderStars(review.rating)}
                                        </span>
                                    </td>
                                    <td style={{ ...styles.td, maxWidth: '300px' }}>
                                        <div style={{ fontWeight: '600', color: '#fff' }}>
                                            {review.title || 'No title'}
                                        </div>
                                        <div style={{ 
                                            color: '#888', 
                                            fontSize: '13px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {review.comment || 'No comment'}
                                        </div>
                                    </td>
                                    <td style={styles.td}>{review.doctor_name || 'Unknown'}</td>
                                    <td style={styles.td}>
                                        {review.is_anonymous ? '🎭 Anonymous' : review.patient_name}
                                    </td>
                                    <td style={styles.td}>
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={styles.td}>{getStatusBadge(review.status)}</td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => { setSelectedReview(review); setShowModal(true); }}
                                            style={styles.actionButton}
                                        >
                                            {review.status === 'reported' ? '⚖️ Moderate' : '👁️ View'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Moderation Modal */}
            {showModal && selectedReview && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0, color: '#fff' }}>
                                {selectedReview.status === 'reported' ? '⚖️ Review Moderation' : '👁️ Review Details'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.reviewCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: '#fcd34d', fontSize: '24px' }}>
                                        {renderStars(selectedReview.rating)}
                                    </span>
                                    {getStatusBadge(selectedReview.status)}
                                </div>
                                <h3 style={{ color: '#fff', margin: '0 0 8px' }}>
                                    {selectedReview.title || 'No title'}
                                </h3>
                                <p style={{ color: '#aaa', lineHeight: '1.6' }}>
                                    {selectedReview.comment || 'No comment provided'}
                                </p>
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '16px', 
                                    marginTop: '16px',
                                    color: '#888',
                                    fontSize: '13px'
                                }}>
                                    <span>👨‍⚕️ {selectedReview.doctor_name}</span>
                                    <span>👤 {selectedReview.is_anonymous ? 'Anonymous' : selectedReview.patient_name}</span>
                                    <span>📅 {new Date(selectedReview.created_at).toLocaleDateString()}</span>
                                </div>
                                {selectedReview.report_count > 0 && (
                                    <div style={{ 
                                        marginTop: '12px', 
                                        padding: '8px 12px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                        borderRadius: '6px',
                                        color: '#f59e0b'
                                    }}>
                                        🚩 Reported {selectedReview.report_count} time(s)
                                    </div>
                                )}
                            </div>

                            {selectedReview.status === 'reported' && (
                                <>
                                    <div style={{ marginTop: '16px' }}>
                                        <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>
                                            Admin Notes:
                                        </label>
                                        <textarea 
                                            id="adminNotes"
                                            placeholder="Add notes about this moderation decision..."
                                            style={styles.textarea}
                                        />
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '12px', 
                                        marginTop: '20px',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button 
                                            onClick={() => handleModerate('approve')}
                                            style={{ ...styles.moderateButton, backgroundColor: '#10b981' }}
                                        >
                                            ✅ Approve
                                        </button>
                                        <button 
                                            onClick={() => handleModerate('hide')}
                                            style={{ ...styles.moderateButton, backgroundColor: '#6b7280' }}
                                        >
                                            🚫 Hide
                                        </button>
                                        <button 
                                            onClick={() => handleModerate('delete')}
                                            style={{ ...styles.moderateButton, backgroundColor: '#ef4444' }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </>
                            )}
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
    statIcon: {
        fontSize: '28px',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#14b8a6'
    },
    statLabel: {
        fontSize: '14px',
        color: '#888',
        marginTop: '4px'
    },
    tabButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    select: {
        padding: '10px 16px',
        backgroundColor: '#2a2a3d',
        border: '1px solid #3a3a4d',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        cursor: 'pointer'
    },
    tableContainer: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        textAlign: 'left',
        padding: '16px',
        backgroundColor: '#1e1e2f',
        color: '#888',
        fontWeight: '500',
        fontSize: '13px',
        textTransform: 'uppercase'
    },
    td: {
        padding: '16px',
        color: '#ccc',
        fontSize: '14px'
    },
    actionButton: {
        padding: '6px 12px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '13px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
    modalBody: {
        padding: '20px'
    },
    reviewCard: {
        backgroundColor: '#1e1e2f',
        borderRadius: '12px',
        padding: '20px'
    },
    textarea: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#1e1e2f',
        border: '1px solid #3a3a4d',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        resize: 'vertical',
        minHeight: '80px'
    },
    moderateButton: {
        padding: '12px 20px',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    }
};

export default DoctorReviewsPanel;

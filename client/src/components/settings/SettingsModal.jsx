import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SecuritySettings from './SecuritySettings';
import PaymentSettings from './PaymentSettings';
import HospitalProfileSettings from '../admin/HospitalProfileSettings';
import { User, Mail, Shield, Save, X, Edit2 } from 'lucide-react';

/**
 * Universal Settings Modal
 * Can be accessed from any dashboard via a settings button
 * Contains security settings and other user preferences
 * Hospital Profile tab visible only to admin users
 */
const SettingsModal = ({ isOpen, onClose, user }) => {
    const [activeTab, setActiveTab] = useState('security');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || user.username,
                email: user.email
            });
        }
    }, [user]);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('/api/auth/profile', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local storage user data
            const updatedUser = { ...user, ...res.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Force update for TopNav
            
            setMessage({ type: 'success', text: 'Profile updated successfully! Refresh to see changes.' });
            setIsEditing(false);
            
            // Optional: Trigger a window reload or context update if needed
            // window.location.reload(); 
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#1e293b',
                borderRadius: '16px',
                width: '90%',
                maxWidth: isAdmin ? '800px' : '600px',
                maxHeight: '85vh',
                overflow: 'hidden',
                color: '#fff',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 25px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, #0f172a, #1e293b)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        ⚙️ Settings
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    padding: '0 20px',
                    overflowX: 'auto'
                }}>
                    {/* Hospital Profile Tab - Admin Only */}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('hospital')}
                            style={{
                                padding: '15px 20px',
                                background: 'none',
                                border: 'none',
                                color: activeTab === 'hospital' ? '#10b981' : 'rgba(255,255,255,0.6)',
                                borderBottom: activeTab === 'hospital' ? '2px solid #10b981' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: activeTab === 'hospital' ? 'bold' : 'normal',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            🏥 Hospital Profile
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{
                            padding: '15px 20px',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'security' ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                            borderBottom: activeTab === 'security' ? '2px solid #3b82f6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: activeTab === 'security' ? 'bold' : 'normal',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        🔐 Security
                    </button>
                    <button
                        onClick={() => setActiveTab('payment')}
                        style={{
                            padding: '15px 20px',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'payment' ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                            borderBottom: activeTab === 'payment' ? '2px solid #3b82f6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: activeTab === 'payment' ? 'bold' : 'normal',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        💳 Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        style={{
                            padding: '15px 20px',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'account' ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                            borderBottom: activeTab === 'account' ? '2px solid #3b82f6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: activeTab === 'account' ? 'bold' : 'normal',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        👤 Account
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px',
                    maxHeight: 'calc(85vh - 140px)',
                    overflowY: 'auto'
                }}>
                    {activeTab === 'hospital' && isAdmin && (
                        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', color: '#333' }}>
                            <HospitalProfileSettings />
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <SecuritySettings
                            userId={user?.id}
                            onUpdate={() => {}}
                        />
                    )}

                    {activeTab === 'payment' && (
                        <PaymentSettings />
                    )}

                    {activeTab === 'account' && (
                        <div>
                            {/* Account Info Card */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h3 style={{ margin: 0 }}>Account Information</h3>
                                    {!isEditing ? (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                color: '#fff',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                color: '#fff',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <X size={14} /> Cancel
                                        </button>
                                    )}
                                </div>

                                {message.text && (
                                    <div style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        marginBottom: '15px',
                                        background: message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: message.type === 'error' ? '#fca5a5' : '#6ee7b7',
                                        border: message.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981'
                                    }}>
                                        {message.text}
                                    </div>
                                )}

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 2fr',
                                    gap: '15px',
                                    fontSize: '0.95rem',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ opacity: 0.6 }}>Username:</span>
                                    <span style={{ fontWeight: 'bold' }}>{user?.username || 'N/A'}</span>

                                    <span style={{ opacity: 0.6 }}>Full Name:</span>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={formData.full_name} 
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'white',
                                                width: '100%'
                                            }}
                                        />
                                    ) : (
                                        <span>{user?.full_name || user?.username || '(Not set)'}</span>
                                    )}

                                    <span style={{ opacity: 0.6 }}>Email:</span>
                                    {isEditing ? (
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'white',
                                                width: '100%'
                                            }}
                                        />
                                    ) : (
                                        <span>{user?.email || 'N/A'}</span>
                                    )}

                                    <span style={{ opacity: 0.6 }}>Role:</span>
                                    <span style={{
                                        background: '#3b82f620',
                                        color: '#3b82f6',
                                        padding: '2px 10px',
                                        borderRadius: '12px',
                                        display: 'inline-block',
                                        width: 'fit-content'
                                    }}>
                                        {user?.role || 'User'}
                                    </span>
                                </div>

                                {isEditing && (
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={handleUpdateProfile}
                                            disabled={loading}
                                            style={{
                                                background: '#3b82f6',
                                                border: 'none',
                                                color: 'white',
                                                padding: '8px 20px',
                                                borderRadius: '8px',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                opacity: loading ? 0.7 : 1
                                            }}
                                        >
                                            {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Session Info */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '20px'
                            }}>
                                <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Session</h3>
                                <p style={{ opacity: 0.7, fontSize: '0.9rem', margin: 0 }}>
                                    Your session is active and secure. Last activity: Just now
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

import React, { useState, useEffect } from 'react';
import RemoteSupportCall from './RemoteSupportCall';

/**
 * Remote Support Modal
 * Provides UI for initiating and managing remote support sessions
 */
const RemoteSupportModal = ({
    isOpen,
    onClose,
    ticketId,
    ticketNumber,
    role = 'Cohost', // User requesting help
    currentUser
}) => {
    const [sessionStarted, setSessionStarted] = useState(false);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ZEGOCLOUD credentials (should come from settings/env)
    const ZEGO_APP_ID = parseInt(import.meta.env.VITE_ZEGO_APP_ID) || 0;
    const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET || '';

    const requestRemoteAccess = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/support/tickets/${ticketId}/remote-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: 60 })
            });

            if (!response.ok) throw new Error('Failed to request access');

            const data = await response.json();
            setAccessToken(data.accessToken);
            setSessionStarted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const endSession = async () => {
        try {
            await fetch(`/api/support/tickets/${ticketId}/remote-access`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error('Failed to end session:', err);
        }
        setSessionStarted(false);
        setAccessToken(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: '#1e293b',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'hidden',
                color: '#fff'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                            🔧 Remote Support Session
                        </h2>
                        {ticketNumber && (
                            <p style={{ margin: '5px 0 0', opacity: 0.6, fontSize: '0.85rem' }}>
                                Ticket: {ticketNumber}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={endSession}
                        style={{
                            background: '#ef4444',
                            border: 'none',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        ✕ End Session
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                    {!sessionStarted ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{
                                fontSize: '4rem',
                                marginBottom: '20px'
                            }}>🖥️</div>
                            <h3 style={{ marginBottom: '15px' }}>
                                Start Remote Support Session
                            </h3>
                            <p style={{
                                opacity: 0.7,
                                marginBottom: '30px',
                                maxWidth: '500px',
                                margin: '0 auto 30px'
                            }}>
                                This will allow our support team to view your screen and
                                help troubleshoot issues in real-time. Your session is
                                encrypted and will expire after 60 minutes.
                            </p>

                            {error && (
                                <p style={{
                                    color: '#ef4444',
                                    marginBottom: '20px'
                                }}>
                                    ⚠️ {error}
                                </p>
                            )}

                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '30px'
                            }}>
                                <h4 style={{ marginBottom: '15px', color: '#3b82f6' }}>
                                    🔐 Security Features
                                </h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '10px',
                                    fontSize: '0.85rem',
                                    textAlign: 'left'
                                }}>
                                    <div>✅ End-to-end encryption</div>
                                    <div>✅ 60-minute session limit</div>
                                    <div>✅ You can end anytime</div>
                                    <div>✅ Session is recorded</div>
                                </div>
                            </div>

                            <button
                                onClick={requestRemoteAccess}
                                disabled={loading}
                                style={{
                                    background: loading
                                        ? '#64748b'
                                        : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '15px 40px',
                                    borderRadius: '30px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                {loading ? '⏳ Connecting...' : '🚀 Start Session'}
                            </button>
                        </div>
                    ) : (
                        <RemoteSupportCall
                            roomId={`support-${ticketId}-${accessToken?.substring(0, 8)}`}
                            userId={currentUser?.id || Date.now()}
                            userName={currentUser?.username || 'User'}
                            role={role}
                            appId={ZEGO_APP_ID}
                            serverSecret={ZEGO_SERVER_SECRET}
                            onCallEnd={endSession}
                        />
                    )}
                </div>

                {/* Footer */}
                {sessionStarted && (
                    <div style={{
                        padding: '15px 20px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem'
                    }}>
                        <span style={{ color: '#10b981' }}>
                            🟢 Session Active
                        </span>
                        <span style={{ opacity: 0.6 }}>
                            Token expires in 60 minutes
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemoteSupportModal;

/**
 * TOTPVerify.jsx
 * Two-Factor Authentication Verification during Login
 */

import React, { useState, useRef, useEffect } from 'react';
import api from '../../utils/axiosInstance';

const TOTPVerify = ({ tempToken, onSuccess, onCancel, onBackupCode }) => {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBackup, setShowBackup] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const inputRefs = useRef([]);

    // Auto-focus first input
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Handle digit input
    const handleDigitChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        
        const newDigits = [...digits];
        newDigits[index] = value.slice(-1); // Only last character
        setDigits(newDigits);
        
        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        
        // Auto-submit when all 6 digits entered
        if (newDigits.every(d => d) && newDigits.join('').length === 6) {
            handleVerify(newDigits.join(''));
        }
    };

    // Handle backspace
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newDigits = paste.split('').concat(Array(6).fill('')).slice(0, 6);
        setDigits(newDigits);
        if (paste.length === 6) {
            handleVerify(paste);
        }
    };

    // Verify TOTP code
    const handleVerify = async (code) => {
        if (code.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/2fa/login-verify', {
                tempToken,
                token: code
            });
            
            if (response.data.success) {
                onSuccess(response.data.token, response.data.user);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid verification code');
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Verify backup code
    const handleBackupVerify = async (e) => {
        e.preventDefault();
        if (!backupCode.trim()) {
            setError('Please enter a backup code');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/2fa/login-verify', {
                tempToken,
                backupCode: backupCode.trim().toUpperCase()
            });
            
            if (response.data.success) {
                onSuccess(response.data.token, response.data.user);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid backup code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-lg" style={{ maxWidth: '400px', margin: 'auto' }}>
            <div className="card-header bg-primary text-white text-center py-3">
                <h5 className="mb-0">
                    <i className="bi bi-shield-check me-2"></i>
                    Two-Factor Authentication
                </h5>
            </div>
            <div className="card-body p-4">
                {error && (
                    <div className="alert alert-danger py-2">
                        <small>{error}</small>
                    </div>
                )}

                {!showBackup ? (
                    <>
                        <p className="text-center text-muted mb-4">
                            Enter the 6-digit code from your authenticator app
                        </p>
                        
                        {/* 6 Digit Input Boxes */}
                        <div className="d-flex justify-content-center gap-2 mb-4" onPaste={handlePaste}>
                            {digits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={el => inputRefs.current[idx] = el}
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control text-center fw-bold"
                                    style={{ 
                                        width: '48px', 
                                        height: '56px', 
                                        fontSize: '1.5rem',
                                        borderRadius: '8px'
                                    }}
                                    value={digit}
                                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    maxLength="1"
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        {loading && (
                            <div className="text-center mb-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Verifying...</span>
                                </div>
                            </div>
                        )}

                        <button 
                            className="btn btn-primary w-100 mb-3"
                            onClick={() => handleVerify(digits.join(''))}
                            disabled={loading || digits.join('').length !== 6}
                        >
                            Verify Code
                        </button>

                        <div className="text-center">
                            <button 
                                className="btn btn-link text-muted"
                                onClick={() => setShowBackup(true)}
                            >
                                Use a backup code instead
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-center text-muted mb-4">
                            Enter one of your backup codes
                        </p>
                        
                        <form onSubmit={handleBackupVerify}>
                            <input
                                type="text"
                                className="form-control form-control-lg text-center font-monospace mb-3"
                                value={backupCode}
                                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXXXX"
                                maxLength="10"
                                autoFocus
                                style={{ letterSpacing: '0.2em' }}
                            />
                            
                            <button 
                                type="submit" 
                                className="btn btn-warning w-100 mb-3"
                                disabled={loading || !backupCode.trim()}
                            >
                                {loading ? 'Verifying...' : 'Use Backup Code'}
                            </button>
                        </form>

                        <div className="text-center">
                            <button 
                                className="btn btn-link text-muted"
                                onClick={() => { setShowBackup(false); setBackupCode(''); }}
                            >
                                ← Back to authenticator code
                            </button>
                        </div>
                    </>
                )}

                {onCancel && (
                    <div className="text-center mt-3 pt-3 border-top">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
                            Cancel and login differently
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TOTPVerify;

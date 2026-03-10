/**
 * SetupTOTP.jsx
 * Two-Factor Authentication Setup Component
 * For Developer/Super Admin security settings
 */

import React, { useState } from 'react';
import api from '../../utils/axiosInstance';

const SetupTOTP = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState('initial'); // initial, scanning, verify, complete
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Generate QR Code
    const handleSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/2fa/setup');
            setQrCode(response.data.qrCode);
            setSecret(response.data.secret);
            setStep('scanning');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to setup 2FA');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify Code
    const handleVerify = async (e) => {
        e.preventDefault();
        if (verifyCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/2fa/verify', { token: verifyCode });
            setBackupCodes(response.data.backupCodes);
            setStep('complete');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    // Copy backup codes
    const copyBackupCodes = () => {
        const text = backupCodes.join('\n');
        navigator.clipboard.writeText(text);
        alert('Backup codes copied to clipboard!');
    };

    // Download backup codes
    const downloadBackupCodes = () => {
        const text = `Wolf HMS - 2FA Backup Codes\n${'='.repeat(30)}\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wolf-hms-backup-codes.txt';
        a.click();
    };

    return (
        <div className="card shadow">
            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                    <i className="bi bi-shield-lock me-2"></i>
                    Two-Factor Authentication Setup
                </h5>
            </div>
            <div className="card-body">
                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                {/* Step: Initial */}
                {step === 'initial' && (
                    <div className="text-center py-4">
                        <div className="mb-4">
                            <i className="bi bi-phone display-1 text-primary"></i>
                        </div>
                        <h4>Secure Your Account</h4>
                        <p className="text-muted mb-4">
                            Add an extra layer of security by using an authenticator app 
                            like Google Authenticator, Authy, or Microsoft Authenticator.
                        </p>
                        <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Recommended for:</strong> Super Admins, Developers, and users with elevated privileges.
                        </div>
                        <div className="d-flex justify-content-center gap-2 mt-4">
                            <button 
                                className="btn btn-primary btn-lg"
                                onClick={handleSetup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Setting up...</>
                                ) : (
                                    <><i className="bi bi-qr-code me-2"></i>Begin Setup</>
                                )}
                            </button>
                            {onCancel && (
                                <button className="btn btn-outline-secondary btn-lg" onClick={onCancel}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step: Scanning QR Code */}
                {step === 'scanning' && (
                    <div className="row">
                        <div className="col-md-6 text-center border-end">
                            <h5 className="mb-3">1. Scan QR Code</h5>
                            <p className="text-muted small">
                                Open your authenticator app and scan this code
                            </p>
                            {qrCode && (
                                <img 
                                    src={qrCode} 
                                    alt="QR Code" 
                                    className="border rounded p-2 bg-white"
                                    style={{ width: '200px', height: '200px' }}
                                />
                            )}
                            <div className="mt-3">
                                <small className="text-muted">Can't scan? Enter this code manually:</small>
                                <div className="font-monospace bg-light p-2 rounded mt-1 user-select-all" style={{ wordBreak: 'break-all' }}>
                                    {secret}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <h5 className="mb-3">2. Enter Verification Code</h5>
                            <p className="text-muted small">
                                Enter the 6-digit code from your authenticator app
                            </p>
                            <form onSubmit={handleVerify}>
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control form-control-lg text-center font-monospace"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength="6"
                                        pattern="\d{6}"
                                        autoFocus
                                        style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="btn btn-success w-100"
                                    disabled={loading || verifyCode.length !== 6}
                                >
                                    {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                                </button>
                            </form>
                            <button 
                                className="btn btn-link text-muted mt-2" 
                                onClick={() => setStep('initial')}
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Complete - Show Backup Codes */}
                {step === 'complete' && (
                    <div className="text-center">
                        <div className="mb-4">
                            <i className="bi bi-check-circle display-1 text-success"></i>
                        </div>
                        <h4 className="text-success">2FA Enabled Successfully!</h4>
                        <p className="text-muted mb-4">
                            Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                        </p>
                        
                        <div className="alert alert-warning">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <strong>Important:</strong> These codes will NOT be shown again!
                        </div>
                        
                        <div className="bg-light p-3 rounded mb-3">
                            <div className="row row-cols-2 row-cols-md-5 g-2">
                                {backupCodes.map((code, idx) => (
                                    <div key={idx} className="col">
                                        <code className="d-block p-2 bg-white rounded border">{code}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="d-flex justify-content-center gap-2 mb-4">
                            <button className="btn btn-outline-primary" onClick={copyBackupCodes}>
                                <i className="bi bi-clipboard me-1"></i> Copy
                            </button>
                            <button className="btn btn-outline-primary" onClick={downloadBackupCodes}>
                                <i className="bi bi-download me-1"></i> Download
                            </button>
                        </div>
                        
                        <button 
                            className="btn btn-success btn-lg"
                            onClick={() => onComplete && onComplete()}
                        >
                            <i className="bi bi-check2 me-2"></i>Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SetupTOTP;

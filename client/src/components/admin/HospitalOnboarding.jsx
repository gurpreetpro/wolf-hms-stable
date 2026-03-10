/**
 * HospitalOnboarding.jsx
 * Multi-Step Wizard for New Hospital/Tenant Creation
 * Wolf HMS - Developer Dashboard
 */

import React, { useState } from 'react';
import api from '../../utils/axiosInstance';
import { APP_CONFIG, getTenantUrl } from '../../config';

const HospitalOnboarding = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [domainAvailable, setDomainAvailable] = useState(null);
    const [checkingDomain, setCheckingDomain] = useState(false);

    
    const [formData, setFormData] = useState({
        // Step 1: Basic Info
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        // Step 2: Size & Pricing
        bed_count: 50,
        staff_count: 25,
        pricing_tier: 'small',
        // Step 3: Branding
        logo_url: '',
        primary_color: '#0d6efd',
        secondary_color: '#6c757d',
        // Step 4: Domain
        subdomain: '',
        custom_domain: '',
        // Step 5: Admin Account
        admin_username: '',
        admin_email: '',
        admin_password: '',
        admin_name: ''
    });

    const checkDomain = async (sub) => {
        if (!sub) {
            setDomainAvailable(null);
            return;
        }
        setCheckingDomain(true);
        try {
            const res = await api.get(`/api/platform/domain-check/${sub}`);
            setDomainAvailable(res.data.data ? res.data.data.available : res.data.available);
        } catch (e) {
            console.error('Domain check failed', e);
        } finally {
            setCheckingDomain(false);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Auto-generate code and subdomain from name
        if (field === 'name' && !formData.code) {
            const code = value.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
            const genSub = code.replace(/_/g, '-');
            setFormData(prev => ({ ...prev, code, subdomain: genSub }));
            checkDomain(genSub);
        }

        if (field === 'subdomain') {
            checkDomain(value);
        }
    };

    // Calculate pricing tier based on beds
    const calculateTier = (beds) => {
        if (beds <= 50) return 'essential';
        if (beds <= 200) return 'professional';
        return 'enterprise';
    };

    const handleBedChange = (value) => {
        const beds = parseInt(value) || 0;
        setFormData(prev => ({
            ...prev,
            bed_count: beds,
            pricing_tier: calculateTier(beds)
        }));
    };

    const validateStep = () => {
        setError('');
        switch (step) {
            case 1:
                if (!formData.name) return setError('Hospital name is required');
                if (!formData.city) return setError('City is required');
                break;
            case 2:
                if (formData.bed_count < 1) return setError('Bed count must be at least 1');
                break;
            case 4:
                if (!formData.subdomain) return setError('Subdomain is required');
                if (!/^[a-z0-9-]+$/.test(formData.subdomain)) return setError('Subdomain can only contain lowercase letters, numbers, and hyphens');
                break;
            case 5:
                if (!formData.admin_username) return setError('Admin username is required');
                if (!formData.admin_email) return setError('Admin email is required');
                if (!formData.admin_password) return setError('Admin password is required');
                if (formData.admin_password.length < 6) return setError('Password must be at least 6 characters');
                break;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setStep(s => s + 1);
    };

    const prevStep = () => {
        setStep(s => s - 1);
        setError('');
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;
        
        setLoading(true);
        setError('');
        try {
            // Deploy tenant atomically
            const res = await api.post('/api/platform/deploy', {
                code: formData.code,
                name: formData.name,
                subdomain: formData.subdomain,
                custom_domain: formData.custom_domain || null,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                phone: formData.phone,
                email: formData.email,
                subscription_tier: formData.pricing_tier,
                admin_username: formData.admin_username,
                admin_email: formData.admin_email,
                admin_password: formData.admin_password,
                settings: {
                    bed_count: formData.bed_count,
                    staff_count: formData.staff_count,
                    logo_url: formData.logo_url || null,
                    primary_color: formData.primary_color,
                    secondary_color: formData.secondary_color
                }
            });

            setStep(6); // Success step
        } catch (err) {
            let errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to deploy hospital';
            if (typeof errMsg === 'object') {
                errMsg = JSON.stringify(errMsg);
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h5 className="modal-title fw-bold">
                    <i className="bi bi-building-add me-2"></i>
                    New Hospital Onboarding
                </h5>
                {onCancel && <button className="btn-close btn-close-white opacity-75" onClick={onCancel}></button>}
            </div>

            {/* Progress Bar */}
            {step < 6 && (
                <div className="px-4 pt-4">
                    <div className="d-flex justify-content-between mb-2">
                        {['Basic Info', 'Size', 'Branding', 'Domain', 'Admin'].map((label, idx) => (
                            <small key={idx} className={step > idx ? 'text-info fw-bold' : 'text-secondary'}>
                                {idx + 1}. {label}
                            </small>
                        ))}
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                        <div 
                            className="progress-bar" 
                            style={{ width: `${(step / 5) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="modal-body p-4">
                {error && <div className="alert alert-danger">{error}</div>}

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="row g-3">
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Hospital Name <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-lg bg-dark text-light border-secondary"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="e.g., Apollo Multi-Specialty Hospital"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Hospital Code</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.code}
                                onChange={(e) => updateField('code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="auto-generated"
                            />
                            <small className="text-info opacity-75">Unique identifier (auto-generated from name)</small>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Email</label>
                            <input
                                type="email"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                placeholder="info@hospital.com"
                            />
                        </div>
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Address</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder="Street address"
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label text-light fw-medium">City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                placeholder="City"
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label text-light fw-medium">State</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.state}
                                onChange={(e) => updateField('state', e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label text-light fw-medium">Phone</label>
                            <input
                                type="tel"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Size & Pricing */}
                {step === 2 && (
                    <div className="row g-4">
                        <div className="col-12 text-center">
                            <h4 className="mb-1 text-light fw-bold">Hospital Size</h4>
                            <p className="text-secondary">All features included. Pricing based on hospital size.</p>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Number of Beds</label>
                            <input
                                type="number"
                                className="form-control form-control-lg bg-dark text-light border-secondary"
                                value={formData.bed_count}
                                onChange={(e) => handleBedChange(e.target.value)}
                                min="1"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Staff Count (Approx)</label>
                            <input
                                type="number"
                                className="form-control form-control-lg"
                                value={formData.staff_count}
                                onChange={(e) => updateField('staff_count', parseInt(e.target.value) || 0)}
                                min="1"
                            />
                        </div>
                        <div className="col-12">
                            <div className={`card border-2 bg-dark ${
                                formData.pricing_tier === 'essential' ? 'border-info' :
                                formData.pricing_tier === 'professional' ? 'border-primary' : 'border-warning'
                            }`}>
                                <div className="card-body text-center">
                                    <h3 className="text-capitalize text-light fw-bold">{formData.pricing_tier} Hospital</h3>
                                    <p className="text-info mb-0">
                                        {formData.pricing_tier === 'essential' && '1-50 beds • Ideal for clinics and small hospitals'}
                                        {formData.pricing_tier === 'professional' && '51-200 beds • Growing hospitals'}
                                        {formData.pricing_tier === 'enterprise' && '200+ beds • Multi-facility enterprise'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Branding */}
                {step === 3 && (
                    <div className="row g-3">
                        <div className="col-12 text-center">
                            <h4 className="text-light fw-bold">Branding</h4>
                            <p className="text-secondary">Customize the look and feel</p>
                        </div>
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Logo URL (Optional)</label>
                            <input
                                type="url"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.logo_url}
                                onChange={(e) => updateField('logo_url', e.target.value)}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Primary Color</label>
                            <div className="input-group">
                                <input
                                    type="color"
                                    className="form-control form-control-color bg-dark border-secondary"
                                    value={formData.primary_color}
                                    onChange={(e) => updateField('primary_color', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="form-control bg-dark text-light border-secondary"
                                    value={formData.primary_color}
                                    onChange={(e) => updateField('primary_color', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Secondary Color</label>
                            <div className="input-group">
                                <input
                                    type="color"
                                    className="form-control form-control-color bg-dark border-secondary"
                                    value={formData.secondary_color}
                                    onChange={(e) => updateField('secondary_color', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="form-control bg-dark text-light border-secondary"
                                    value={formData.secondary_color}
                                    onChange={(e) => updateField('secondary_color', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Preview</label>
                            <div className="border border-secondary bg-dark bg-opacity-50 rounded p-3 d-flex align-items-center gap-3">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain' }} />
                                ) : (
                                    <div 
                                        className="rounded d-flex align-items-center justify-content-center text-white fw-bold"
                                        style={{ width: 40, height: 40, backgroundColor: formData.primary_color }}
                                    >
                                        {formData.name?.charAt(0) || 'H'}
                                    </div>
                                )}
                                <div>
                                    <strong style={{ color: formData.primary_color }}>{formData.name || 'Hospital Name'}</strong>
                                    <small className="d-block" style={{ color: formData.secondary_color }}>Healthcare Management System</small>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Domain */}
                {step === 4 && (
                    <div className="row g-3">
                        <div className="col-12 text-center">
                            <h4 className="text-light fw-bold">Domain Configuration</h4>
                            <p className="text-secondary">Set up your hospital's web address</p>
                        </div>
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Subdomain <span className="text-danger">*</span></label>
                            <div className="input-group input-group-lg">
                                <input
                                    type="text"
                                    className="form-control bg-dark text-light border-secondary"
                                    value={formData.subdomain}
                                    onChange={(e) => updateField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="your-hospital"
                                />
                                <span className="input-group-text bg-dark text-secondary border-secondary">.{APP_CONFIG.MASTER_DOMAIN}</span>
                            </div>
                            {checkingDomain ? (
                                <small className="text-warning"><span className="spinner-border spinner-border-sm me-1"></span>Checking availability...</small>
                            ) : domainAvailable === true ? (
                                <small className="text-success fw-bold"><i className="bi bi-check-circle-fill me-1"></i>Domain is available!</small>
                            ) : domainAvailable === false ? (
                                <small className="text-danger fw-bold"><i className="bi bi-x-circle-fill me-1"></i>Domain is already taken</small>
                            ) : (
                                <small className="text-secondary">This will be the hospital's default URL</small>
                            )}
                        </div>
                        <div className="col-12">
                            <label className="form-label text-light fw-medium">Custom Domain (Optional)</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.custom_domain}
                                onChange={(e) => updateField('custom_domain', e.target.value)}
                                placeholder={`hms.yourhospital.com`}
                            />
                            <small className="text-secondary">Requires DNS configuration (instructions will be provided)</small>
                        </div>
                        <div className="col-12">
                            <div className="alert alert-info bg-primary bg-opacity-10 border-primary border-opacity-25 text-info mb-0">
                                <strong>Hospital URL:</strong>{' '}
                                <code>{getTenantUrl(formData.subdomain || 'your-hospital')}</code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Admin Account */}
                {step === 5 && (
                    <div className="row g-3">
                        <div className="col-12 text-center">
                            <h4 className="text-light fw-bold">Administrator Account</h4>
                            <p className="text-muted">Create the first admin user for this hospital</p>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Admin Name</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.admin_name}
                                onChange={(e) => updateField('admin_name', e.target.value)}
                                placeholder="Dr. John Smith"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Username <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.admin_username}
                                onChange={(e) => updateField('admin_username', e.target.value)}
                                placeholder="admin"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Email <span className="text-danger">*</span></label>
                            <input
                                type="email"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.admin_email}
                                onChange={(e) => updateField('admin_email', e.target.value)}
                                placeholder="admin@hospital.com"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label text-light fw-medium">Password <span className="text-danger">*</span></label>
                            <input
                                type="password"
                                className="form-control bg-dark text-light border-secondary"
                                value={formData.admin_password}
                                onChange={(e) => updateField('admin_password', e.target.value)}
                                placeholder="Min 6 characters"
                            />
                        </div>
                    </div>
                )}

                {/* Step 6: Success */}
                {step === 6 && (
                    <div className="text-center py-5">
                        <div className="mb-4 d-flex justify-content-center">
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}>
                                <i className="bi bi-check-lg display-4 text-white"></i>
                            </div>
                        </div>
                        <h2 className="text-white fw-bold mb-2">Tenant Deployed Successfully!</h2>
                        <p className="text-muted mb-4 fs-5">
                            <strong>{formData.name}</strong> is now live on the Wolf HMS Network.
                        </p>
                        
                        <div className="row justify-content-center mb-5">
                            <div className="col-md-8">
                                <div className="card bg-dark border-secondary text-start shadow-sm">
                                    <div className="card-body p-4">
                                        <div className="d-flex align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-50">
                                            <div className="bg-primary bg-opacity-10 text-primary rounded p-2 me-3">
                                                <i className="bi bi-globe2 fs-4"></i>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>Platform URL</small>
                                                <a href={getTenantUrl(formData.subdomain)} className="text-info fs-5 text-decoration-none" target="_blank" rel="noreferrer">
                                                    {getTenantUrl(formData.subdomain)} ↗
                                                </a>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-warning bg-opacity-10 text-warning rounded p-2 me-3">
                                                <i className="bi bi-person-badge fs-4"></i>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>Admin Credentials</small>
                                                <span className="text-light fs-5">{formData.admin_username}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="d-flex gap-3 justify-content-center">
                            <button className="btn btn-outline-secondary btn-lg px-4" onClick={onComplete}>
                                Return to Fleet
                            </button>
                            <button 
                                className="btn btn-primary btn-lg px-4" 
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none' }}
                                onClick={() => window.open(getTenantUrl(formData.subdomain), '_blank')}
                            >
                                <i className="bi bi-box-arrow-up-right me-2"></i> Open Tenant Portal
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            {step < 6 && (
                <div className="modal-footer border-secondary border-opacity-50">
                    <button 
                        className="btn btn-dark text-light border-secondary"
                        onClick={step === 1 ? onCancel : prevStep}
                    >
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {step < 5 ? (
                        <button className="btn btn-primary" onClick={nextStep}>
                            Next →
                        </button>
                    ) : (
                        <button 
                            className="btn btn-success"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                            ) : (
                                <><i className="bi bi-check2 me-2"></i>Create Hospital</>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default HospitalOnboarding;

/**
 * HospitalEditForm.jsx
 * Form for editing existing hospital details
 * Wolf HMS - Developer Dashboard
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosInstance';

const HospitalEditForm = ({ hospital, onComplete, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    
    const [formData, setFormData] = useState({
        name: '',
        code: '', // Read-only usually
        subdomain: '',
        custom_domain: '',
        logo_url: '',
        primary_color: '#0d6efd',
        secondary_color: '#6c757d',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        subscription_tier: 'professional',
        bed_count: 50, // Extracted from settings
        staff_count: 25, // Extracted from settings
        is_active: true
    });

    useEffect(() => {
        if (hospital) {
            setFormData({
                name: hospital.name || '',
                code: hospital.code || '',
                subdomain: hospital.subdomain || '',
                custom_domain: hospital.custom_domain || '',
                logo_url: hospital.logo_url || '',
                primary_color: hospital.primary_color || '#0d6efd',
                secondary_color: hospital.secondary_color || '#6c757d',
                address: hospital.address || '',
                city: hospital.city || '',
                state: hospital.state || '',
                phone: hospital.phone || '',
                email: hospital.email || '',
                subscription_tier: hospital.subscription_tier || 'professional',
                bed_count: hospital.settings?.bed_count || 50,
                staff_count: hospital.settings?.staff_count || 25,
                is_active: hospital.is_active
            });
        }
    }, [hospital]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare payload - merge bed/staff counts back into settings
            const payload = {
                ...formData,
                settings: {
                    bed_count: parseInt(formData.bed_count),
                    staff_count: parseInt(formData.staff_count)
                }
            };

            await api.put(`/api/hospitals/${hospital.id}`, payload);
            if (onComplete) onComplete();
        } catch (err) {
            console.error('Update failed:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update hospital');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: 'bi-info-circle' },
        { id: 'branding', label: 'Branding & Domain', icon: 'bi-palette' },
        { id: 'config', label: 'Configuration', icon: 'bi-sliders' }
    ];

    return (
        <div className="d-flex flex-column h-100">
            <div className="modal-header bg-light">
                <h5 className="modal-title">
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit Hospital: {hospital.name}
                </h5>
                <button type="button" className="btn-close" onClick={onCancel}></button>
            </div>

            <div className="modal-body p-0 d-flex flex-grow-1 overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="bg-light border-end" style={{ width: '200px', minWidth: '200px' }}>
                    <div className="list-group list-group-flush pt-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`list-group-item list-group-item-action border-0 px-3 py-3 ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`bi ${tab.icon} me-2`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-grow-1 p-4 overflow-auto">
                    {error && <div className="alert alert-danger mb-4">{error}</div>}

                    <form id="editForm" onSubmit={handleSubmit}>
                        {activeTab === 'basic' && (
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Hospital Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Hospital Code</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.code}
                                        disabled
                                        readOnly
                                    />
                                    <small className="text-muted">Unique ID (Cannot be changed)</small>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Status</label>
                                    <div className="form-check form-switch mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleChange}
                                            id="statusSwitch"
                                        />
                                        <label className="form-check-label" htmlFor="statusSwitch">
                                            {formData.is_active ? 'Active' : 'Inactive'}
                                        </label>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">City</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">State</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-control"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows="2"
                                    ></textarea>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'branding' && (
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Subdomain</label>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="subdomain"
                                            value={formData.subdomain}
                                            onChange={handleChange}
                                        />
                                        <span className="input-group-text">.wolfhms.com</span>
                                    </div>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Custom Domain</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="custom_domain"
                                        value={formData.custom_domain}
                                        onChange={handleChange}
                                        placeholder="e.g., hms.hospital.com"
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Logo URL</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="logo_url"
                                        value={formData.logo_url}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Primary Color</label>
                                    <div className="input-group">
                                        <input
                                            type="color"
                                            className="form-control form-control-color"
                                            name="primary_color"
                                            value={formData.primary_color}
                                            onChange={handleChange}
                                        />
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="primary_color"
                                            value={formData.primary_color}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Secondary Color</label>
                                    <div className="input-group">
                                        <input
                                            type="color"
                                            className="form-control form-control-color"
                                            name="secondary_color"
                                            value={formData.secondary_color}
                                            onChange={handleChange}
                                        />
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="secondary_color"
                                            value={formData.secondary_color}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'config' && (
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Subscription Tier</label>
                                    <select
                                        className="form-select"
                                        name="subscription_tier"
                                        value={formData.subscription_tier}
                                        onChange={handleChange}
                                    >
                                        <option value="essential">Essential (Small)</option>
                                        <option value="professional">Professional (Medium)</option>
                                        <option value="enterprise">Enterprise (Large)</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Bed Count</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="bed_count"
                                        value={formData.bed_count}
                                        onChange={handleChange}
                                        min="1"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Staff Limit</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="staff_count"
                                        value={formData.staff_count}
                                        onChange={handleChange}
                                        min="1"
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button 
                    type="submit" 
                    form="editForm" 
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                    ) : (
                        <><i className="bi bi-save me-2"></i>Save Changes</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default HospitalEditForm;

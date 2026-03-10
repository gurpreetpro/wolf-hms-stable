/**
 * PermissionManager.jsx
 * Admin UI for managing role permissions
 * Phase 1: Security Hardening (Gold Standard HMS)
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosInstance';

const MODULES = [
    'users', 'patients', 'appointments', 'billing', 'pharmacy', 
    'lab', 'radiology', 'reports', 'settings', 'vitals',
    'prescriptions', 'care_plans', 'admissions', 'ward'
];

const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'accountant'];

const ACTIONS = ['create', 'read', 'update', 'delete', 'export'];

const PermissionManager = () => {
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRole, setSelectedRole] = useState('doctor');
    const [message, setMessage] = useState('');

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/admin/permissions/${selectedRole}`);
            setPermissions(response.data.permissions || {});
        } catch (error) {
            console.error('Error fetching permissions:', error);
            // Initialize with defaults if not found
            const defaults = {};
            MODULES.forEach(module => {
                defaults[module] = { create: false, read: true, update: false, delete: false, export: false };
            });
            setPermissions(defaults);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRole]);

    const togglePermission = (module, action) => {
        setPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: !prev[module]?.[action]
            }
        }));
    };

    const savePermissions = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.put(`/api/admin/permissions/${selectedRole}`, { permissions });
            setMessage('Permissions saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to save permissions');
            console.error(error);
        }
        setSaving(false);
    };

    const setAllForModule = (module, value) => {
        setPermissions(prev => ({
            ...prev,
            [module]: ACTIONS.reduce((acc, action) => ({ ...acc, [action]: value }), {})
        }));
    };

    return (
        <div className="permission-manager">
            <div className="permission-header">
                <h2>🔐 Permission Manager</h2>
                <p className="subtitle">Configure role-based access control for each module</p>
            </div>

            <div className="role-selector">
                <label>Select Role:</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                    {ROLES.map(role => (
                        <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading permissions...</div>
            ) : (
                <div className="permission-table-container">
                    <table className="permission-table">
                        <thead>
                            <tr>
                                <th>Module</th>
                                {ACTIONS.map(action => (
                                    <th key={action}>{action.charAt(0).toUpperCase() + action.slice(1)}</th>
                                ))}
                                <th>Quick</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MODULES.map(module => (
                                <tr key={module}>
                                    <td className="module-name">{module.replace('_', ' ')}</td>
                                    {ACTIONS.map(action => (
                                        <td key={action}>
                                            <label className="toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={permissions[module]?.[action] || false}
                                                    onChange={() => togglePermission(module, action)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </td>
                                    ))}
                                    <td>
                                        <button 
                                            className="btn-all"
                                            onClick={() => setAllForModule(module, true)}
                                        >
                                            All
                                        </button>
                                        <button 
                                            className="btn-none"
                                            onClick={() => setAllForModule(module, false)}
                                        >
                                            None
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="permission-actions">
                <button 
                    className="btn-save"
                    onClick={savePermissions}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : '💾 Save Permissions'}
                </button>
                {message && <span className={message.includes('success') ? 'success' : 'error'}>{message}</span>}
            </div>

            <style jsx>{`
                .permission-manager {
                    padding: 24px;
                    background: var(--bg-card, #fff);
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .permission-header h2 {
                    margin: 0 0 8px 0;
                    color: var(--text-primary, #1a1a2e);
                }
                .subtitle {
                    color: var(--text-muted, #666);
                    margin-bottom: 24px;
                }
                .role-selector {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .role-selector select {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    font-size: 14px;
                }
                .permission-table-container {
                    overflow-x: auto;
                }
                .permission-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .permission-table th, .permission-table td {
                    padding: 12px 8px;
                    text-align: center;
                    border-bottom: 1px solid #eee;
                }
                .permission-table th {
                    background: #f8f9fa;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .module-name {
                    text-align: left;
                    text-transform: capitalize;
                    font-weight: 500;
                }
                .toggle {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 22px;
                }
                .toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .3s;
                    border-radius: 22px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #10b981;
                }
                input:checked + .slider:before {
                    transform: translateX(18px);
                }
                .btn-all, .btn-none {
                    padding: 4px 8px;
                    margin: 0 2px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                }
                .btn-all {
                    background: #10b981;
                    color: white;
                }
                .btn-none {
                    background: #ef4444;
                    color: white;
                }
                .permission-actions {
                    margin-top: 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .btn-save {
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .btn-save:hover:not(:disabled) {
                    transform: translateY(-2px);
                }
                .btn-save:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .success { color: #10b981; }
                .error { color: #ef4444; }
                .loading {
                    padding: 40px;
                    text-align: center;
                    color: #666;
                }
            `}</style>
        </div>
    );
};

export default PermissionManager;

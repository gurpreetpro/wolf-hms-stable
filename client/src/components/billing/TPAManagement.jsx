import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Alert, Spinner, Badge, Tab, Tabs } from 'react-bootstrap';
import { Building2, Plus, Settings, CheckCircle, XCircle, TestTube, Shield, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';

/**
 * TPA Management Dashboard
 * Dynamic onboarding and management of TPA providers
 */
const TPAManagement = () => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCredentialModal, setShowCredentialModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [testResults, setTestResults] = useState({});

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/tpa/providers?includeInactive=true', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProviders(Array.isArray(response.data) ? response.data : (response.data?.data || []));
        } catch (err) {
            setError('Failed to load TPA providers');
            // Fallback demo data
            setProviders([
                { id: 1, code: 'nhcx', name: 'National Health Claims Exchange', short_name: 'NHCX', integration_type: 'nhcx', is_active: true, is_verified: true },
                { id: 2, code: 'star_health', name: 'Star Health Insurance', short_name: 'Star', integration_type: 'api', is_active: true, is_verified: false },
                { id: 3, code: 'medi_assist', name: 'Medi Assist TPA', short_name: 'MediAssist', integration_type: 'api', is_active: true, is_verified: false },
                { id: 4, code: 'pmjay', name: 'PM-JAY / Ayushman Bharat', short_name: 'PMJAY', integration_type: 'pmjay', is_active: true, is_verified: false },
                { id: 5, code: 'icici_lombard', name: 'ICICI Lombard', short_name: 'ICICI', integration_type: 'nhcx', is_active: true, is_verified: false }
            ]);
        }
        setLoading(false);
    };

    const handleTestConnection = async (providerCode) => {
        setTestResults(prev => ({ ...prev, [providerCode]: 'testing' }));
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/tpa/providers/${providerCode}/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTestResults(prev => ({ ...prev, [providerCode]: response.data.success ? 'success' : 'failed' }));
        } catch {
            setTestResults(prev => ({ ...prev, [providerCode]: 'failed' }));
        }
    };

    const handleAddProvider = async (formData) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/tpa/providers', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProviders();
            setShowAddModal(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add provider');
        }
    };

    const handleSaveCredentials = async (credentials) => {
        try {
            const token = localStorage.getItem('token');
            for (const [key, value] of Object.entries(credentials)) {
                if (value) {
                    await axios.post(`/api/tpa/providers/${selectedProvider.code}/credentials`, {
                        key,
                        value,
                        isProduction: credentials.isProduction || false
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            }
            setShowCredentialModal(false);
            fetchProviders();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save credentials');
        }
    };

    const handleDeactivate = async (providerCode) => {
        if (!window.confirm('Deactivate this TPA provider?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/tpa/providers/${providerCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProviders();
        } catch (err) {
            setError('Failed to deactivate provider');
        }
    };

    const getStatusBadge = (provider) => {
        if (!provider.is_active) return <Badge bg="secondary">Inactive</Badge>;
        if (provider.is_verified) return <Badge bg="success">Verified</Badge>;
        return <Badge bg="warning">Pending Setup</Badge>;
    };

    const getTestBadge = (code) => {
        const result = testResults[code];
        if (!result) return null;
        if (result === 'testing') return <Spinner animation="border" size="sm" />;
        if (result === 'success') return <Badge bg="success"><CheckCircle size={12} /> Connected</Badge>;
        return <Badge bg="danger"><XCircle size={12} /> Failed</Badge>;
    };

    if (loading) {
        return <div className="text-center py-5"><Spinner animation="border" /></div>;
    }

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><Building2 className="me-2" /> TPA Provider Management</h2>
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} className="me-1" /> Add New TPA
                </Button>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Provider</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Connection</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map(provider => (
                                <tr key={provider.id}>
                                    <td>
                                        <strong>{provider.name}</strong>
                                        <div className="text-muted small">{provider.code}</div>
                                    </td>
                                    <td>
                                        <Badge bg="info">{provider.integration_type?.toUpperCase()}</Badge>
                                    </td>
                                    <td>{getStatusBadge(provider)}</td>
                                    <td>{getTestBadge(provider.code)}</td>
                                    <td className="text-end">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            className="me-1"
                                            onClick={() => handleTestConnection(provider.code)}
                                        >
                                            <TestTube size={14} />
                                        </Button>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            className="me-1"
                                            onClick={() => {
                                                setSelectedProvider(provider);
                                                setShowCredentialModal(true);
                                            }}
                                        >
                                            <Shield size={14} /> Credentials
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDeactivate(provider.code)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Add Provider Modal */}
            <AddProviderModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                onSave={handleAddProvider}
            />

            {/* Credential Modal */}
            <CredentialModal
                show={showCredentialModal}
                onHide={() => setShowCredentialModal(false)}
                provider={selectedProvider}
                onSave={handleSaveCredentials}
            />
        </div>
    );
};

// Add Provider Modal Component
const AddProviderModal = ({ show, onHide, onSave }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        shortName: '',
        integrationType: 'api',
        apiBaseUrl: '',
        supportsEligibility: true,
        supportsPreauth: true,
        supportsEclaim: true
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title><Plus size={20} className="me-2" /> Add New TPA Provider</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Provider Code *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., new_health_tpa"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                                <Form.Text className="text-muted">Lowercase, no spaces</Form.Text>
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Short Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., NewHealth"
                                    value={formData.shortName}
                                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Full Name *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="e.g., New Health Insurance TPA"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Integration Type</Form.Label>
                                <Form.Select
                                    value={formData.integrationType}
                                    onChange={(e) => setFormData({ ...formData, integrationType: e.target.value })}
                                >
                                    <option value="api">Direct API</option>
                                    <option value="nhcx">NHCX (Claims Exchange)</option>
                                    <option value="portal">Web Portal</option>
                                    <option value="email">Email-based</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>API Base URL</Form.Label>
                                <Form.Control
                                    type="url"
                                    placeholder="https://api.example.com"
                                    value={formData.apiBaseUrl}
                                    onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <div className="border-top pt-3 mt-3">
                        <strong>Supported Features:</strong>
                        <div className="row mt-2">
                            <div className="col-md-4">
                                <Form.Check
                                    type="checkbox"
                                    label="Eligibility Check"
                                    checked={formData.supportsEligibility}
                                    onChange={(e) => setFormData({ ...formData, supportsEligibility: e.target.checked })}
                                />
                            </div>
                            <div className="col-md-4">
                                <Form.Check
                                    type="checkbox"
                                    label="Pre-Authorization"
                                    checked={formData.supportsPreauth}
                                    onChange={(e) => setFormData({ ...formData, supportsPreauth: e.target.checked })}
                                />
                            </div>
                            <div className="col-md-4">
                                <Form.Check
                                    type="checkbox"
                                    label="E-Claims"
                                    checked={formData.supportsEclaim}
                                    onChange={(e) => setFormData({ ...formData, supportsEclaim: e.target.checked })}
                                />
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit">Add Provider</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

// Credential Modal Component
const CredentialModal = ({ show, onHide, provider, onSave }) => {
    const [credentials, setCredentials] = useState({
        api_key: '',
        hospital_code: '',
        client_id: '',
        client_secret: '',
        isProduction: false
    });

    if (!provider) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(credentials);
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title><Shield size={20} className="me-2" /> {provider.name} Credentials</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Alert variant="info" className="small">
                        <strong>Note:</strong> Credentials are encrypted before storage.
                    </Alert>

                    <Form.Group className="mb-3">
                        <Form.Label>API Key</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Enter API key"
                            value={credentials.api_key}
                            onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Hospital Code</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Your hospital's code with this TPA"
                            value={credentials.hospital_code}
                            onChange={(e) => setCredentials({ ...credentials, hospital_code: e.target.value })}
                        />
                    </Form.Group>

                    {provider.integration_type === 'api' && (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Client ID (if OAuth)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={credentials.client_id}
                                    onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Client Secret</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={credentials.client_secret}
                                    onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
                                />
                            </Form.Group>
                        </>
                    )}

                    <Form.Check
                        type="switch"
                        label="Production Environment"
                        checked={credentials.isProduction}
                        onChange={(e) => setCredentials({ ...credentials, isProduction: e.target.checked })}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit">Save Credentials</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default TPAManagement;

/**
 * ConsentManager Component
 * WOLF HMS - Phase 3 ABDM Compliance
 * Manage patient consent for health record sharing
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Spinner, Modal, Form, Alert, ListGroup } from 'react-bootstrap';
import {
    FileCheck, Clock, Check, X, Eye, Send, Shield,
    Calendar, AlertTriangle, RefreshCw, FileText
} from 'lucide-react';
import api from '../utils/axiosInstance';

// HI Types available in ABDM
const HI_TYPES = [
    { code: 'Prescription', label: 'Prescriptions', icon: '💊' },
    { code: 'DiagnosticReport', label: 'Lab/Diagnostic Reports', icon: '🔬' },
    { code: 'OPConsultation', label: 'OPD Consultations', icon: '🏥' },
    { code: 'DischargeSummary', label: 'Discharge Summaries', icon: '📋' },
    { code: 'ImmunizationRecord', label: 'Immunization Records', icon: '💉' },
    { code: 'HealthDocumentRecord', label: 'Health Documents', icon: '📄' }
];

const ConsentManager = ({ patientId, abhaNumber }) => {
    const [consents, setConsents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewConsent, setShowNewConsent] = useState(false);
    const [showConsentDetail, setShowConsentDetail] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (patientId) {
            fetchConsents();
        }
    }, [patientId]);

    const fetchConsents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/abdm/consent/patient/${patientId}`);
            setConsents(res.data.consents || []);
        } catch (err) {
            console.error('Fetch consents error:', err);
        }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'pending': { bg: 'warning', icon: Clock },
            'granted': { bg: 'success', icon: Check },
            'denied': { bg: 'danger', icon: X },
            'revoked': { bg: 'secondary', icon: X },
            'expired': { bg: 'dark', icon: AlertTriangle }
        };
        const config = statusMap[status] || statusMap.pending;
        const Icon = config.icon;
        return (
            <Badge bg={config.bg}>
                <Icon size={12} className="me-1" />
                {status?.toUpperCase()}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" variant="primary" size="sm" />
                <span className="ms-2">Loading consents...</span>
            </div>
        );
    }

    return (
        <div className="consent-manager">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                    <FileCheck size={18} className="me-2" />
                    Consent Manager
                </h6>
                <div>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={fetchConsents}
                    >
                        <RefreshCw size={14} />
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowNewConsent(true)}
                        disabled={!abhaNumber}
                    >
                        <Send size={14} className="me-1" />
                        Request Consent
                    </Button>
                </div>
            </div>

            {!abhaNumber && (
                <Alert variant="info" className="small">
                    <Shield size={14} className="me-2" />
                    Please link ABHA number before managing consents
                </Alert>
            )}

            {/* Consents Table */}
            {consents.length > 0 ? (
                <Table size="sm" hover>
                    <thead>
                        <tr>
                            <th>Consent ID</th>
                            <th>Purpose</th>
                            <th>HI Types</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consents.map(consent => (
                            <tr key={consent.id}>
                                <td>
                                    <code className="small">{consent.consent_id?.substring(0, 20)}...</code>
                                </td>
                                <td>{consent.purpose}</td>
                                <td>
                                    <div className="d-flex flex-wrap gap-1">
                                        {(consent.hi_types || []).slice(0, 2).map(type => (
                                            <Badge key={type} bg="light" text="dark" className="small">
                                                {type}
                                            </Badge>
                                        ))}
                                        {(consent.hi_types || []).length > 2 && (
                                            <Badge bg="light" text="dark">+{consent.hi_types.length - 2}</Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="small">
                                    {consent.permission_from && consent.permission_to && (
                                        <>
                                            {new Date(consent.permission_from).toLocaleDateString()} -<br />
                                            {new Date(consent.permission_to).toLocaleDateString()}
                                        </>
                                    )}
                                </td>
                                <td>{getStatusBadge(consent.status)}</td>
                                <td>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setShowConsentDetail(consent)}
                                    >
                                        <Eye size={12} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                <Card className="text-center bg-light border-0">
                    <Card.Body className="py-4">
                        <FileText size={32} className="text-muted mb-2" />
                        <p className="text-muted mb-0">No consent requests yet</p>
                    </Card.Body>
                </Card>
            )}

            {/* New Consent Modal */}
            <NewConsentModal
                show={showNewConsent}
                onHide={() => setShowNewConsent(false)}
                patientId={patientId}
                abhaNumber={abhaNumber}
                onCreated={() => {
                    setShowNewConsent(false);
                    fetchConsents();
                }}
            />

            {/* Consent Detail Modal */}
            <ConsentDetailModal
                consent={showConsentDetail}
                onHide={() => setShowConsentDetail(null)}
            />
        </div>
    );
};

// New Consent Request Modal
const NewConsentModal = ({ show, onHide, patientId, abhaNumber, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        purpose: 'CAREMGT',
        hi_types: ['Prescription', 'DiagnosticReport'],
        permission_from: new Date().toISOString().split('T')[0],
        permission_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    const purposes = [
        { code: 'CAREMGT', label: 'Care Management' },
        { code: 'BTG', label: 'Break the Glass (Emergency)' },
        { code: 'PUBHLTH', label: 'Public Health' },
        { code: 'HPAYMT', label: 'Healthcare Payment' },
        { code: 'DSRCH', label: 'Disease Specific Research' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/abdm/consent', {
                patient_id: patientId,
                abha_number: abhaNumber,
                purpose: purposes.find(p => p.code === formData.purpose)?.label,
                purpose_code: formData.purpose,
                hi_types: formData.hi_types,
                permission_from: formData.permission_from,
                permission_to: formData.permission_to
            });

            onCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create consent request');
        }
        setLoading(false);
    };

    const toggleHIType = (type) => {
        setFormData(prev => ({
            ...prev,
            hi_types: prev.hi_types.includes(type)
                ? prev.hi_types.filter(t => t !== type)
                : [...prev.hi_types, type]
        }));
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <Send size={18} className="me-2" />
                    Request Patient Consent
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {/* Purpose */}
                    <Form.Group className="mb-4">
                        <Form.Label>Purpose of Request</Form.Label>
                        <Form.Select
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        >
                            {purposes.map(p => (
                                <option key={p.code} value={p.code}>{p.label}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {/* HI Types */}
                    <Form.Group className="mb-4">
                        <Form.Label>Health Information Types</Form.Label>
                        <Row className="g-2">
                            {HI_TYPES.map(type => (
                                <Col key={type.code} md={4}>
                                    <Card
                                        className={`cursor-pointer ${formData.hi_types.includes(type.code) ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                        onClick={() => toggleHIType(type.code)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card.Body className="py-2 text-center small">
                                            <span className="me-1">{type.icon}</span>
                                            {type.label}
                                            {formData.hi_types.includes(type.code) && (
                                                <Check size={14} className="ms-1 text-primary" />
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    {/* Date Range */}
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>From Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formData.permission_from}
                                    onChange={(e) => setFormData({ ...formData, permission_from: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>To Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formData.permission_to}
                                    onChange={(e) => setFormData({ ...formData, permission_to: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Alert variant="info" className="small">
                        <Shield size={14} className="me-2" />
                        The patient will receive a notification on their PHR app to approve this request.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || formData.hi_types.length === 0}
                    >
                        {loading ? <Spinner size="sm" /> : <Send size={14} className="me-1" />}
                        Send Request
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

// Consent Detail Modal
const ConsentDetailModal = ({ consent, onHide }) => {
    if (!consent) return null;

    return (
        <Modal show={!!consent} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Consent Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between">
                        <span className="text-muted">Consent ID</span>
                        <code className="small">{consent.consent_id}</code>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                        <span className="text-muted">Purpose</span>
                        <span>{consent.purpose}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                        <span className="text-muted">Status</span>
                        <span>
                            <Badge bg={consent.status === 'granted' ? 'success' : 'warning'}>
                                {consent.status?.toUpperCase()}
                            </Badge>
                        </span>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <span className="text-muted d-block mb-1">Health Information Types</span>
                        <div className="d-flex flex-wrap gap-1">
                            {(consent.hi_types || []).map(type => (
                                <Badge key={type} bg="info">{type}</Badge>
                            ))}
                        </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between">
                        <span className="text-muted">Created</span>
                        <span>{new Date(consent.created_at).toLocaleString()}</span>
                    </ListGroup.Item>
                    {consent.granted_at && (
                        <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">Granted</span>
                            <span>{new Date(consent.granted_at).toLocaleString()}</span>
                        </ListGroup.Item>
                    )}
                </ListGroup>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConsentManager;

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Form, Spinner, Alert, Row, Col, Modal } from 'react-bootstrap';
import { Shield, CheckCircle, XCircle, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * Insurance Eligibility Verification Component
 * Used in patient registration to verify insurance coverage
 */
const EligibilityVerification = ({ patientId, onVerified }) => {
    const [insurances, setInsurances] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        if (patientId) {
            loadData();
        }
    }, [patientId]);

    const loadData = async () => {
        try {
            const [insRes, provRes] = await Promise.all([
                api.get(`/api/preauth/patient/${patientId}/insurance`),
                api.get('/api/preauth/providers')
            ]);
            setInsurances(insRes.data);
            setProviders(provRes.data);
        } catch (error) {
            console.error('Error loading insurance data:', error);
            // Mock data
            setProviders([
                { id: 1, name: 'Star Health Insurance', code: 'STAR' },
                { id: 2, name: 'ICICI Lombard', code: 'ICICI' },
                { id: 3, name: 'Medi Assist TPA', code: 'MEDI' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (insuranceId) => {
        setVerifying(true);
        setVerificationResult(null);
        try {
            const res = await api.post('/api/preauth/verify-eligibility', {
                patient_insurance_id: insuranceId
            });
            setVerificationResult(res.data);
            if (onVerified) {
                onVerified(res.data);
            }
            loadData(); // Refresh status
        } catch (error) {
            console.error('Verification error:', error);
            setVerificationResult({
                eligible: false,
                message: 'Verification failed. Please try again.'
            });
        } finally {
            setVerifying(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Verified':
                return <Badge bg="success"><CheckCircle size={12} /> Verified</Badge>;
            case 'Failed':
                return <Badge bg="danger"><XCircle size={12} /> Failed</Badge>;
            case 'Expired':
                return <Badge bg="warning"><AlertTriangle size={12} /> Expired</Badge>;
            default:
                return <Badge bg="secondary">Pending</Badge>;
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">
                    <Shield size={16} className="me-2 text-primary" />
                    Insurance Coverage
                </h6>
                <Button variant="outline-primary" size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus size={14} /> Add Insurance
                </Button>
            </Card.Header>
            <Card.Body>
                {verificationResult && (
                    <Alert variant={verificationResult.eligible ? 'success' : 'danger'} className="mb-3">
                        {verificationResult.eligible ? (
                            <><CheckCircle size={16} className="me-2" /> {verificationResult.message}</>
                        ) : (
                            <><XCircle size={16} className="me-2" /> {verificationResult.message}</>
                        )}
                    </Alert>
                )}

                {insurances.length === 0 ? (
                    <p className="text-muted text-center py-3">
                        No insurance policies on file
                    </p>
                ) : (
                    insurances.map((ins) => (
                        <div key={ins.id} className="border rounded p-3 mb-2">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong>{ins.provider_name}</strong>
                                    {ins.is_primary && <Badge bg="info" className="ms-2">Primary</Badge>}
                                </div>
                                {getStatusBadge(ins.verification_status)}
                            </div>
                            <Row className="small text-muted mb-2">
                                <Col>Policy: {ins.policy_number}</Col>
                                <Col>Member ID: {ins.member_id || '-'}</Col>
                            </Row>
                            <Row className="small text-muted mb-2">
                                <Col>Coverage: {new Date(ins.coverage_start).toLocaleDateString()} - {new Date(ins.coverage_end).toLocaleDateString()}</Col>
                                <Col>Copay: {ins.copay_percentage}%</Col>
                            </Row>
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleVerify(ins.id)}
                                disabled={verifying}
                            >
                                {verifying ? <Spinner size="sm" /> : <><RefreshCw size={14} className="me-1" /> Verify Eligibility</>}
                            </Button>
                        </div>
                    ))
                )}
            </Card.Body>

            {/* Add Insurance Modal */}
            <AddInsuranceModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                patientId={patientId}
                providers={providers}
                onSuccess={() => {
                    setShowAddModal(false);
                    loadData();
                }}
            />
        </Card>
    );
};

/**
 * Add Insurance Modal
 */
const AddInsuranceModal = ({ show, onHide, patientId, providers, onSuccess }) => {
    const [form, setForm] = useState({
        provider_id: '',
        policy_number: '',
        member_id: '',
        policy_holder_name: '',
        relationship: 'Self',
        coverage_start: '',
        coverage_end: '',
        copay_percentage: 20,
        is_primary: true
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/api/preauth/patient/insurance', {
                patient_id: patientId,
                ...form
            });
            onSuccess();
        } catch (error) {
            console.error('Error adding insurance:', error);
            alert('Failed to add insurance');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title><Plus size={20} className="me-2" />Add Insurance Policy</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Insurance Provider *</Form.Label>
                        <Form.Select
                            required
                            value={form.provider_id}
                            onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                        >
                            <option value="">Select Provider</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Policy Number *</Form.Label>
                                <Form.Control
                                    required
                                    value={form.policy_number}
                                    onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
                                    placeholder="e.g., POL123456"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Member ID</Form.Label>
                                <Form.Control
                                    value={form.member_id}
                                    onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Coverage Start *</Form.Label>
                                <Form.Control
                                    type="date"
                                    required
                                    value={form.coverage_start}
                                    onChange={(e) => setForm({ ...form, coverage_start: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Coverage End *</Form.Label>
                                <Form.Control
                                    type="date"
                                    required
                                    value={form.coverage_end}
                                    onChange={(e) => setForm({ ...form, coverage_end: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Relationship</Form.Label>
                                <Form.Select
                                    value={form.relationship}
                                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                                >
                                    <option>Self</option>
                                    <option>Spouse</option>
                                    <option>Child</option>
                                    <option>Parent</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Copay %</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.copay_percentage}
                                    onChange={(e) => setForm({ ...form, copay_percentage: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Check
                        type="checkbox"
                        label="Set as Primary Insurance"
                        checked={form.is_primary}
                        onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : 'Add Insurance'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default EligibilityVerification;

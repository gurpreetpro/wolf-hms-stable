/**
 * InsuranceVerifier Component
 * WOLF HMS - Phase 2 Insurance/TPA Integration
 * Verify patient insurance and link to their profile
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge, ListGroup } from 'react-bootstrap';
import { Shield, Check, X, Search, Building2, Phone, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

const InsuranceVerifier = ({ show, onHide, patient, onInsuranceLinked }) => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [linking, setLinking] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        provider_id: '',
        policy_number: ''
    });

    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        if (show) {
            fetchProviders();
            setVerificationResult(null);
            setError(null);
            setSuccess(null);
        }
    }, [show]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/insurance/providers');
            setProviders(res.data.providers || []);
        } catch (err) {
            console.error('Fetch providers error:', err);
        }
        setLoading(false);
    };

    const handleVerify = async () => {
        if (!formData.provider_id || !formData.policy_number) {
            setError('Please select provider and enter policy number');
            return;
        }

        setVerifying(true);
        setError(null);
        setVerificationResult(null);

        try {
            const res = await api.post('/api/insurance/verify', {
                provider_id: formData.provider_id,
                policy_number: formData.policy_number
            });
            setVerificationResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        }
        setVerifying(false);
    };

    const handleLinkInsurance = async () => {
        if (!verificationResult || !verificationResult.valid) {
            setError('Please verify policy first');
            return;
        }

        setLinking(true);
        setError(null);

        try {
            const insuranceData = {
                provider_id: formData.provider_id,
                policy_number: formData.policy_number,
                ...verificationResult.policyDetails
            };

            await api.post(`/api/insurance/patient/${patient.patient_id}/link`, insuranceData);
            setSuccess('Insurance linked successfully!');

            setTimeout(() => {
                onInsuranceLinked && onInsuranceLinked();
                onHide();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to link insurance');
        }
        setLinking(false);
    };

    const selectedProvider = providers.find(p => p.id === parseInt(formData.provider_id));

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <Shield className="me-2" size={20} />
                    Insurance Verification
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Loading providers...</p>
                    </div>
                ) : (
                    <>
                        {/* Patient Info */}
                        {patient && (
                            <Card className="mb-4 border-0 bg-light">
                                <Card.Body className="py-2">
                                    <Row className="align-items-center">
                                        <Col>
                                            <strong>{patient.name}</strong>
                                            <br />
                                            <small className="text-muted">
                                                {patient.patient_number} | {patient.phone}
                                            </small>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        )}

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                <X size={16} className="me-2" />
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert variant="success">
                                <Check size={16} className="me-2" />
                                {success}
                            </Alert>
                        )}

                        {/* Verification Form */}
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Insurance Provider / TPA</Form.Label>
                                    <Form.Select
                                        value={formData.provider_id}
                                        onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                                    >
                                        <option value="">Select Provider</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.short_name} ({p.network_hospitals?.toLocaleString()} hospitals)
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Policy Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter policy number"
                                        value={formData.policy_number}
                                        onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Provider Info */}
                        {selectedProvider && (
                            <Card className="mb-4 border-info">
                                <Card.Body className="py-2">
                                    <Row className="align-items-center">
                                        <Col>
                                            <div className="d-flex align-items-center">
                                                <Building2 size={18} className="text-info me-2" />
                                                <strong>{selectedProvider.name}</strong>
                                            </div>
                                        </Col>
                                        <Col xs="auto">
                                            <div className="d-flex align-items-center text-muted">
                                                <Phone size={14} className="me-1" />
                                                {selectedProvider.toll_free}
                                            </div>
                                        </Col>
                                        <Col xs="auto">
                                            <Badge bg="success">
                                                {selectedProvider.approval_rate}% Approval
                                            </Badge>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        )}

                        <div className="text-center mb-4">
                            <Button
                                variant="outline-primary"
                                onClick={handleVerify}
                                disabled={verifying || !formData.provider_id || !formData.policy_number}
                            >
                                {verifying ? (
                                    <>
                                        <Spinner size="sm" className="me-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Search size={16} className="me-2" />
                                        Verify Policy
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Verification Result */}
                        {verificationResult && (
                            <Card className={`border-${verificationResult.valid ? 'success' : 'danger'}`}>
                                <Card.Header className={`bg-${verificationResult.valid ? 'success' : 'danger'} text-white`}>
                                    {verificationResult.valid ? (
                                        <><Check size={18} className="me-2" /> Policy Verified</>
                                    ) : (
                                        <><AlertTriangle size={18} className="me-2" /> Verification Failed</>
                                    )}
                                </Card.Header>
                                {verificationResult.valid && verificationResult.policyDetails && (
                                    <Card.Body>
                                        <ListGroup variant="flush">
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Sum Insured</span>
                                                <strong>₹{verificationResult.policyDetails.sumInsured?.toLocaleString()}</strong>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Balance Available</span>
                                                <strong className="text-success">
                                                    ₹{verificationResult.policyDetails.balanceRemaining?.toLocaleString()}
                                                </strong>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Policy Type</span>
                                                <span>{verificationResult.policyDetails.policyType}</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Room Rent Limit</span>
                                                <span>₹{verificationResult.policyDetails.roomRentLimit?.toLocaleString()}/day</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Co-pay</span>
                                                <span>{verificationResult.policyDetails.copayPercentage}%</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Valid Until</span>
                                                <span>{verificationResult.policyDetails.validTo}</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex justify-content-between">
                                                <span className="text-muted">Status</span>
                                                <Badge bg="success">{verificationResult.policyDetails.coverageStatus}</Badge>
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </Card.Body>
                                )}
                            </Card>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                {verificationResult?.valid && (
                    <Button
                        variant="success"
                        onClick={handleLinkInsurance}
                        disabled={linking}
                    >
                        {linking ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Linking...
                            </>
                        ) : (
                            <>
                                <Check size={16} className="me-2" />
                                Link Insurance
                            </>
                        )}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default InsuranceVerifier;

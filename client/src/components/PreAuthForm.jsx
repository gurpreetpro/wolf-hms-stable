/**
 * PreAuthForm Component
 * WOLF HMS - Phase 2 Insurance/TPA Integration
 * Create and track pre-authorization requests
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge, ProgressBar } from 'react-bootstrap';
import { FileCheck, Send, Clock, Check, X, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

const PreAuthForm = ({ show, onHide, admission, patientInsurance, onPreAuthCreated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [denialRisk, setDenialRisk] = useState(null);

    const [formData, setFormData] = useState({
        requested_amount: '',
        primary_diagnosis: '',
        diagnosis_codes: '',
        procedure_codes: '',
        treatment_type: '',
        expected_los: '',
        room_type: 'semi-private'
    });

    useEffect(() => {
        if (show) {
            setError(null);
            setSuccess(null);
            setDenialRisk(null);
        }
    }, [show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const checkDenialRisk = async () => {
        try {
            const res = await api.post('/api/insurance/predict-denial', {
                diagnosis_codes: formData.diagnosis_codes ? formData.diagnosis_codes.split(',').map(c => c.trim()) : [],
                procedure_codes: formData.procedure_codes ? formData.procedure_codes.split(',').map(c => c.trim()) : [],
                preauth_approved: false,
                documentation_score: 70,
                claim_amount: parseFloat(formData.requested_amount) || 0
            });
            setDenialRisk(res.data);
        } catch (err) {
            console.error('Check denial risk error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.requested_amount || !formData.primary_diagnosis) {
            setError('Please fill in required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const preauthData = {
                admission_id: admission?.id,
                patient_insurance_id: patientInsurance?.id,
                requested_amount: parseFloat(formData.requested_amount),
                primary_diagnosis: formData.primary_diagnosis,
                diagnosis_codes: formData.diagnosis_codes ? formData.diagnosis_codes.split(',').map(c => c.trim()) : [],
                procedure_codes: formData.procedure_codes ? formData.procedure_codes.split(',').map(c => c.trim()) : [],
                treatment_type: formData.treatment_type,
                expected_los: parseInt(formData.expected_los) || 3,
                room_type: formData.room_type
            };

            const res = await api.post('/api/insurance/preauth', preauthData);
            setSuccess(`Pre-authorization submitted successfully! Number: ${res.data.preauth.preauth_number}`);

            setTimeout(() => {
                onPreAuthCreated && onPreAuthCreated(res.data.preauth);
                onHide();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit pre-authorization');
        }
        setLoading(false);
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-warning text-dark">
                <Modal.Title>
                    <FileCheck className="me-2" size={20} />
                    Pre-Authorization Request
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
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

                    {/* Insurance Info */}
                    {patientInsurance && (
                        <Card className="mb-4 border-info bg-light">
                            <Card.Body className="py-2">
                                <Row>
                                    <Col>
                                        <small className="text-muted">Provider</small>
                                        <div><strong>{patientInsurance.short_name || 'TPA'}</strong></div>
                                    </Col>
                                    <Col>
                                        <small className="text-muted">Policy</small>
                                        <div><strong>{patientInsurance.policy_number}</strong></div>
                                    </Col>
                                    <Col>
                                        <small className="text-muted">Balance</small>
                                        <div className="text-success">
                                            <strong>₹{parseFloat(patientInsurance.balance_remaining || 0).toLocaleString()}</strong>
                                        </div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    )}

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Requested Amount *</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text">₹</span>
                                    <Form.Control
                                        type="number"
                                        name="requested_amount"
                                        value={formData.requested_amount}
                                        onChange={handleChange}
                                        placeholder="Enter amount"
                                        required
                                    />
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Expected Length of Stay (days)</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="expected_los"
                                    value={formData.expected_los}
                                    onChange={handleChange}
                                    placeholder="3"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Primary Diagnosis *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="primary_diagnosis"
                                    value={formData.primary_diagnosis}
                                    onChange={handleChange}
                                    placeholder="e.g., Acute Appendicitis"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>ICD-10 Diagnosis Codes</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="diagnosis_codes"
                                    value={formData.diagnosis_codes}
                                    onChange={handleChange}
                                    placeholder="K35.80, K35.89"
                                />
                                <Form.Text className="text-muted">
                                    Comma-separated codes
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Procedure Codes</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="procedure_codes"
                                    value={formData.procedure_codes}
                                    onChange={handleChange}
                                    placeholder="44950, 44970"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Treatment Type</Form.Label>
                                <Form.Select
                                    name="treatment_type"
                                    value={formData.treatment_type}
                                    onChange={handleChange}
                                >
                                    <option value="">Select type</option>
                                    <option value="medical">Medical Management</option>
                                    <option value="surgical">Surgical</option>
                                    <option value="daycare">Day Care</option>
                                    <option value="maternity">Maternity</option>
                                    <option value="emergency">Emergency</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Room Type</Form.Label>
                                <Form.Select
                                    name="room_type"
                                    value={formData.room_type}
                                    onChange={handleChange}
                                >
                                    <option value="general">General Ward</option>
                                    <option value="semi-private">Semi-Private</option>
                                    <option value="private">Private</option>
                                    <option value="icu">ICU</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* AI Denial Risk Prediction */}
                    <Card className="mt-4 border-secondary">
                        <Card.Header className="bg-secondary text-white d-flex justify-content-between align-items-center">
                            <span>AI Denial Risk Assessment</span>
                            <Button
                                variant="light"
                                size="sm"
                                onClick={checkDenialRisk}
                                disabled={!formData.requested_amount}
                            >
                                Check Risk
                            </Button>
                        </Card.Header>
                        {denialRisk && (
                            <Card.Body>
                                <Row className="align-items-center mb-3">
                                    <Col md={3}>
                                        <div className="text-center">
                                            <h3 className={`text-${getRiskColor(denialRisk.riskLevel)} mb-0`}>
                                                {denialRisk.riskScore}%
                                            </h3>
                                            <Badge bg={getRiskColor(denialRisk.riskLevel)}>
                                                {denialRisk.riskLevel?.toUpperCase()} RISK
                                            </Badge>
                                        </div>
                                    </Col>
                                    <Col md={9}>
                                        <ProgressBar
                                            now={denialRisk.riskScore}
                                            variant={getRiskColor(denialRisk.riskLevel)}
                                            style={{ height: '10px' }}
                                        />
                                    </Col>
                                </Row>

                                {denialRisk.riskFactors && denialRisk.riskFactors.length > 0 && (
                                    <div>
                                        <small className="text-muted">Risk Factors:</small>
                                        <ul className="mb-0 small">
                                            {denialRisk.riskFactors.map((f, i) => (
                                                <li key={i}>
                                                    <Badge bg="outline-danger" className="me-1">{f.code}</Badge>
                                                    {f.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Card.Body>
                        )}
                    </Card>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button
                        variant="warning"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={16} className="me-2" />
                                Submit Pre-Auth
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default PreAuthForm;

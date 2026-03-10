/**
 * ABHALinker Component
 * WOLF HMS - Phase 3 ABDM Compliance
 * Link ABHA (Ayushman Bharat Health Account) to patient
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge, ListGroup } from 'react-bootstrap';
import { Shield, Check, X, Search, Link, Smartphone, User, MapPin, Calendar } from 'lucide-react';
import api from '../utils/axiosInstance';

const ABHALinker = ({ show, onHide, patient, onABHALinked }) => {
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [linking, setLinking] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [existingABHA, setExistingABHA] = useState(null);

    const [abhaNumber, setABHANumber] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        if (show && patient) {
            fetchExistingABHA();
            setVerificationResult(null);
            setError(null);
            setSuccess(null);
            setABHANumber('');
        }
    }, [show, patient]);

    const fetchExistingABHA = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/abdm/abha/patient/${patient.patient_id}`);
            if (res.data && res.data.abha_number) {
                setExistingABHA(res.data);
            } else {
                setExistingABHA(null);
            }
        } catch (err) {
            console.error('Fetch ABHA error:', err);
        }
        setLoading(false);
    };

    const formatABHANumber = (value) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        // Format as XX-XXXX-XXXX-XXXX
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
    };

    const handleABHAChange = (e) => {
        const formatted = formatABHANumber(e.target.value);
        setABHANumber(formatted);
    };

    const handleVerify = async () => {
        if (!abhaNumber || abhaNumber.length < 17) {
            setError('Please enter a valid 14-digit ABHA number');
            return;
        }

        setVerifying(true);
        setError(null);
        setVerificationResult(null);

        try {
            const res = await api.post('/abdm/abha/verify', { abha_number: abhaNumber });
            setVerificationResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        }
        setVerifying(false);
    };

    const handleLink = async () => {
        if (!verificationResult || !verificationResult.valid) {
            setError('Please verify ABHA number first');
            return;
        }

        setLinking(true);
        setError(null);

        try {
            await api.post(`/abdm/abha/link/${patient.patient_id}`, {
                abha_number: abhaNumber,
                profile: verificationResult.profile
            });

            setSuccess('ABHA linked successfully!');

            setTimeout(() => {
                onABHALinked && onABHALinked();
                onHide();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to link ABHA');
        }
        setLinking(false);
    };

    const renderABHAInfo = (abha) => (
        <Card className="bg-success text-white">
            <Card.Body>
                <Row className="align-items-center">
                    <Col xs="auto">
                        <div className="bg-white rounded-circle p-2">
                            <Shield size={32} className="text-success" />
                        </div>
                    </Col>
                    <Col>
                        <h5 className="mb-1">ABHA Linked</h5>
                        <code className="text-white fs-5">{abha.abha_number}</code>
                        {abha.health_id && (
                            <div className="small mt-1">{abha.health_id}</div>
                        )}
                    </Col>
                    <Col xs="auto">
                        {abha.kyc_verified && (
                            <Badge bg="light" text="success">
                                <Check size={12} className="me-1" />
                                KYC Verified
                            </Badge>
                        )}
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <Shield className="me-2" size={20} />
                    ABHA - Ayushman Bharat Health Account
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Checking ABHA status...</p>
                    </div>
                ) : (
                    <>
                        {/* Patient Info */}
                        {patient && (
                            <Card className="mb-4 border-0 bg-light">
                                <Card.Body className="py-2">
                                    <Row className="align-items-center">
                                        <Col xs="auto">
                                            <User size={20} className="text-muted" />
                                        </Col>
                                        <Col>
                                            <strong>{patient.name}</strong>
                                            <span className="text-muted ms-2">{patient.patient_number}</span>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        )}

                        {/* Already Linked */}
                        {existingABHA && (
                            <div className="mb-4">
                                {renderABHAInfo(existingABHA)}
                                <div className="text-center mt-3">
                                    <small className="text-muted">
                                        Linked on {new Date(existingABHA.linked_at).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>
                        )}

                        {/* Link New ABHA */}
                        {!existingABHA && (
                            <>
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

                                {/* ABHA Input */}
                                <Form.Group className="mb-4">
                                    <Form.Label>ABHA Number</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <Shield size={18} />
                                        </span>
                                        <Form.Control
                                            type="text"
                                            placeholder="XX-XXXX-XXXX-XXXX"
                                            value={abhaNumber}
                                            onChange={handleABHAChange}
                                            maxLength={17}
                                            style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}
                                        />
                                        <Button
                                            variant="outline-primary"
                                            onClick={handleVerify}
                                            disabled={verifying || abhaNumber.length < 17}
                                        >
                                            {verifying ? (
                                                <Spinner size="sm" />
                                            ) : (
                                                <>
                                                    <Search size={16} className="me-1" />
                                                    Verify
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <Form.Text className="text-muted">
                                        Enter 14-digit ABHA number issued by National Health Authority
                                    </Form.Text>
                                </Form.Group>

                                {/* Verification Result */}
                                {verificationResult && (
                                    <Card className={`border-${verificationResult.valid ? 'success' : 'danger'}`}>
                                        <Card.Header className={`bg-${verificationResult.valid ? 'success' : 'danger'} text-white`}>
                                            {verificationResult.valid ? (
                                                <><Check size={18} className="me-2" /> ABHA Verified</>
                                            ) : (
                                                <><X size={18} className="me-2" /> Verification Failed</>
                                            )}
                                        </Card.Header>
                                        {verificationResult.valid && verificationResult.profile && (
                                            <Card.Body>
                                                <ListGroup variant="flush">
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <User size={16} className="text-muted me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>Name</span>
                                                        <strong>{verificationResult.profile.name}</strong>
                                                    </ListGroup.Item>
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <Calendar size={16} className="text-muted me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>DOB</span>
                                                        <span>{verificationResult.profile.dateOfBirth}</span>
                                                    </ListGroup.Item>
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <Smartphone size={16} className="text-muted me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>Mobile</span>
                                                        <span>{verificationResult.profile.mobile}</span>
                                                    </ListGroup.Item>
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <MapPin size={16} className="text-muted me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>Address</span>
                                                        <span>{verificationResult.profile.address}</span>
                                                    </ListGroup.Item>
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <Shield size={16} className="text-muted me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>Health ID</span>
                                                        <code>{verificationResult.profile.healthId}</code>
                                                    </ListGroup.Item>
                                                    <ListGroup.Item className="d-flex align-items-center">
                                                        <Check size={16} className="text-success me-2" />
                                                        <span className="text-muted" style={{ width: 100 }}>KYC</span>
                                                        <Badge bg={verificationResult.profile.kycVerified ? 'success' : 'warning'}>
                                                            {verificationResult.profile.kycVerified ? 'Verified' : 'Pending'}
                                                        </Badge>
                                                    </ListGroup.Item>
                                                </ListGroup>
                                            </Card.Body>
                                        )}
                                    </Card>
                                )}

                                {/* ABHA Info */}
                                <Card className="mt-4 border-info">
                                    <Card.Body className="small">
                                        <h6 className="text-info mb-2">What is ABHA?</h6>
                                        <p className="mb-1">
                                            ABHA (Ayushman Bharat Health Account) is a 14-digit unique identifier issued by
                                            the National Health Authority (NHA) under Ayushman Bharat Digital Mission.
                                        </p>
                                        <p className="mb-0 text-muted">
                                            Linking ABHA enables digital health records sharing and interoperability
                                            across healthcare providers in India.
                                        </p>
                                    </Card.Body>
                                </Card>
                            </>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    {existingABHA ? 'Close' : 'Cancel'}
                </Button>
                {!existingABHA && verificationResult?.valid && (
                    <Button
                        variant="success"
                        onClick={handleLink}
                        disabled={linking}
                    >
                        {linking ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Linking...
                            </>
                        ) : (
                            <>
                                <Link size={16} className="me-2" />
                                Link ABHA to Patient
                            </>
                        )}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default ABHALinker;

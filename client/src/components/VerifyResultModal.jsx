import React, { useState } from 'react';
import { Modal, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { CheckCircle, Shield, AlertCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * VerifyResultModal - E-signature verification workflow
 * 
 * @param {boolean} show - Modal visibility
 * @param {object} result - Result object to verify
 * @param {function} onHide - Close handler
 * @param {function} onVerified - Callback after successful verification
 */
const VerifyResultModal = ({ show, result, onHide, onVerified }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmed, setConfirmed] = useState(false);

    const handleVerify = async () => {
        if (!confirmed) {
            setError('Please confirm that you have reviewed the results');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await api.post(`/api/lab/result/${result.id}/verify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (onVerified) onVerified();
            onHide();
        } catch (err) {
            console.error('Verify error:', err);
            setError('Failed to verify result. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-success bg-opacity-10">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Shield className="text-success" size={24} />
                    Verify Result (E-Signature)
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {result && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Test:</span>
                            <strong>{result.test_name}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Patient:</span>
                            <strong>{result.patient_name}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Status:</span>
                            <Badge bg={result.verified_by ? 'success' : 'warning'}>
                                {result.verified_by ? 'Verified' : 'Pending Verification'}
                            </Badge>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <div className="bg-light p-3 rounded mb-3">
                    <strong>⚠️ Important:</strong>
                    <p className="mb-0 small text-muted">
                        By verifying this result, you confirm that:
                    </p>
                    <ul className="small text-muted mb-0">
                        <li>You have reviewed all values carefully</li>
                        <li>The results are accurate and complete</li>
                        <li>This action will be logged with your credentials</li>
                    </ul>
                </div>

                <Form.Check
                    type="checkbox"
                    id="confirm-verify"
                    label="I confirm that I have reviewed the results and they are accurate"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mb-3"
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button
                    variant="success"
                    onClick={handleVerify}
                    disabled={loading || !confirmed}
                    className="d-flex align-items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Spinner size="sm" animation="border" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} />
                            Verify & Sign
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default VerifyResultModal;

import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Badge } from 'react-bootstrap';
import { AlertTriangle, IndianRupee } from 'lucide-react';

const RefundConfirmationModal = ({ show, onHide, visit, onConfirm }) => {
    const [refundMode, setRefundMode] = useState('full'); // full, partial, none
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        let finalAmount = 0;
        if (refundMode === 'full') finalAmount = visit?.consultation_fee || 500;
        else if (refundMode === 'partial') finalAmount = amount;
        else finalAmount = 0;

        onConfirm({
            amount: finalAmount,
            reason
        });
    };

    if (!visit) return null;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="border-0 bg-danger bg-opacity-10">
                <Modal.Title className="text-danger fw-bold d-flex align-items-center gap-2">
                    <AlertTriangle /> Cancel Appointment
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant="warning" className="d-flex align-items-center gap-2">
                    <IndianRupee size={18} />
                    <strong>Financial Action Required</strong>
                </Alert>

                <p className="mb-4">
                    You are cancelling the appointment for <strong className="fs-5">{visit.patient_name}</strong>.
                    <br />
                    <span className="text-muted">Token: {visit.token_number}</span>
                </p>

                <Form>
                    <Form.Label className="fw-bold">Refund Action</Form.Label>
                    <div className="d-flex gap-3 mb-4">
                        <Button
                            variant={refundMode === 'full' ? "success" : "outline-secondary"}
                            className="flex-grow-1"
                            onClick={() => { setRefundMode('full'); setAmount('500'); }}
                        >
                            Full Refund
                            <div className="small opacity-75">₹{visit?.consultation_fee || 500}</div>
                        </Button>
                        <Button
                            variant={refundMode === 'partial' ? "warning" : "outline-secondary"}
                            className="flex-grow-1"
                            onClick={() => { setRefundMode('partial'); setAmount(''); }}
                        >
                            Partial
                            <div className="small opacity-75">Custom ₹</div>
                        </Button>
                        <Button
                            variant={refundMode === 'none' ? "danger" : "outline-secondary"}
                            className="flex-grow-1"
                            onClick={() => { setRefundMode('none'); setAmount('0'); }}
                        >
                            No Refund
                            <div className="small opacity-75">Forfeit</div>
                        </Button>
                    </div>

                    {refundMode === 'partial' && (
                        <Form.Group className="mb-3">
                            <Form.Label>Refund Amount (₹)</Form.Label>
                            <Form.Control
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Enter amount to refund"
                                autoFocus
                            />
                        </Form.Group>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Cancellation Reason</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Why is it being cancelled?"
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="border-0">
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="danger" onClick={handleSubmit}>Confirm Cancellation</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RefundConfirmationModal;

import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

const RefundModal = ({ show, onHide, transaction, refreshData }) => {
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async () => {
        if (!quantity || quantity <= 0) {
            setError("Invalid Quantity");
            return;
        }
        if (quantity > transaction.quantity) {
            setError(`Cannot return more than sold (${transaction.quantity})`);
            return;
        }
        if (!reason) {
            setError("Reason is required");
            return;
        }

        try {
            await api.post('/api/pharmacy/refund', {
                invoice_item_id: transaction.id,
                return_quantity: quantity,
                reason
            });
            setSuccess('Refund Processed Successfully!');
            setTimeout(() => {
                setSuccess('');
                refreshData();
                onHide();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || "Refund Failed");
        }
    };

    if (!transaction) return null;

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Process Refund/Return</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <h6 className="fw-bold">{transaction.description}</h6>
                <div className="text-muted small mb-3">
                    Patient: {transaction.patient_name || 'N/A'} <br />
                    Original Qty: {transaction.quantity} @ {formatCurrency(transaction.unit_price)}
                </div>

                <Form.Group className="mb-3">
                    <Form.Label>Quantity to Return</Form.Label>
                    <Form.Control
                        type="number"
                        max={transaction.quantity}
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value))}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Reason</Form.Label>
                    <Form.Select value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="">Select Reason...</option>
                        <option value="Customer Return (Unopened)">Customer Return (Unopened)</option>
                        <option value="Dispensing Error">Dispensing Error / Wrong Item</option>
                        <option value="Damaged Item">Damaged / Defective</option>
                        <option value="Adverse Reaction">Adverse Reaction (Clinical)</option>
                        <option value="Other">Other</option>
                    </Form.Select>
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="danger" onClick={handleSubmit}>Confirm Refund</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RefundModal;

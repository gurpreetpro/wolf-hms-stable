import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { FlaskConical, CreditCard, AlertCircle, CheckCircle, User } from 'lucide-react';
import api from '../../utils/axiosInstance';
import { formatCurrency } from '../../utils/currency';

/**
 * LabPaymentsTab - Collect Lab Payments from Billing Dashboard
 * Part of Dual-Department Payment Integration (Phase 5)
 */
const LabPaymentsTab = () => {
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        reference: ''
    });
    const [processing, setProcessing] = useState(false);

    // Fetch pending lab payments
    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/lab/pending-payments');
            setPendingPayments(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching pending payments:', err);
            setError('Failed to load pending lab payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const handleOpenPaymentModal = (order) => {
        setSelectedOrder(order);
        setPaymentDetails({
            amount: order.test_price || '',
            reference: ''
        });
        setPaymentMethod('');
        setShowPaymentModal(true);
    };

    const handleCollectPayment = async () => {
        if (!paymentMethod) {
            setError('Please select a payment method');
            return;
        }

        if (!paymentDetails.amount || parseFloat(paymentDetails.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setProcessing(true);
        try {
            await api.post(`/api/lab/payment/${selectedOrder.id}`, {
                payment_method: paymentMethod,
                amount: parseFloat(paymentDetails.amount),
                transaction_ref: paymentDetails.reference || null,
                payment_location: 'billing' // Collected from Billing Dashboard
            });

            setSuccess(`Payment collected for ${selectedOrder.patient_name} - ${selectedOrder.test_name}`);
            setShowPaymentModal(false);
            fetchPendingPayments(); // Refresh list
            
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.response?.data?.message || 'Failed to process payment');
        } finally {
            setProcessing(false);
        }
    };

    const paymentMethods = [
        { id: 'cash', label: '💵 Cash', requiresRef: false },
        { id: 'upi', label: '📱 UPI', requiresRef: true },
        { id: 'pos_card', label: '💳 POS Card', requiresRef: true },
        { id: 'pos_upi', label: '📲 POS UPI', requiresRef: true }
    ];

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading pending lab payments...</p>
            </div>
        );
    }

    return (
        <div className="p-3">
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <span className="fw-bold d-flex align-items-center gap-2">
                        <FlaskConical size={18} /> Pending Lab Payments (OPD)
                    </span>
                    <Badge bg="light" text="dark" className="fs-6">{pendingPayments.length} pending</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    {pendingPayments.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <CheckCircle size={48} className="mb-3 text-success" />
                            <h5>All Lab Payments Collected!</h5>
                            <p>No pending OPD lab payments at this time.</p>
                        </div>
                    ) : (
                        <Table hover responsive className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Patient</th>
                                    <th>Test</th>
                                    <th className="text-end">Amount</th>
                                    <th>Ordered By</th>
                                    <th>Requested</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPayments.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <div className="fw-bold">{order.patient_name || 'Unknown'}</div>
                                            <small className="text-muted">{order.patient_phone || '-'}</small>
                                        </td>
                                        <td>
                                            <Badge bg="info" className="me-1">{order.test_name}</Badge>
                                        </td>
                                        <td className="text-end fw-bold text-primary">
                                            {formatCurrency(order.test_price || 0)}
                                        </td>
                                        <td>
                                            <small className="text-muted">Dr. {order.ordered_by_doctor || '-'}</small>
                                        </td>
                                        <td>
                                            <small>
                                                {order.requested_at 
                                                    ? new Date(order.requested_at).toLocaleString('en-IN', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                      })
                                                    : '-'}
                                            </small>
                                        </td>
                                        <td className="text-center">
                                            <Button 
                                                size="sm" 
                                                variant="success"
                                                onClick={() => handleOpenPaymentModal(order)}
                                            >
                                                <CreditCard size={14} className="me-1" /> Collect
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Payment Collection Modal */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <CreditCard size={20} /> Collect Lab Payment
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedOrder && (
                        <>
                            {/* Order Details */}
                            <Card className="mb-3 bg-light border-0">
                                <Card.Body className="py-2">
                                    <Row>
                                        <Col>
                                            <small className="text-muted">Patient</small>
                                            <div className="fw-bold">{selectedOrder.patient_name}</div>
                                        </Col>
                                        <Col>
                                            <small className="text-muted">Test</small>
                                            <div className="fw-bold text-info">{selectedOrder.test_name}</div>
                                        </Col>
                                        <Col>
                                            <small className="text-muted">Amount</small>
                                            <div className="fw-bold text-success fs-5">
                                                {formatCurrency(selectedOrder.test_price || 0)}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Payment Method Selection */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Select Payment Method *</Form.Label>
                                <div className="d-flex flex-wrap gap-2">
                                    {paymentMethods.map((method) => (
                                        <Button
                                            key={method.id}
                                            variant={paymentMethod === method.id ? 'primary' : 'outline-secondary'}
                                            onClick={() => setPaymentMethod(method.id)}
                                        >
                                            {method.label}
                                        </Button>
                                    ))}
                                </div>
                            </Form.Group>

                            {/* Amount */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Amount (₹) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={paymentDetails.amount}
                                    onChange={(e) => setPaymentDetails({...paymentDetails, amount: e.target.value})}
                                />
                            </Form.Group>

                            {/* Reference - for non-cash */}
                            {paymentMethod && paymentMethods.find(m => m.id === paymentMethod)?.requiresRef && (
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Transaction Reference *</Form.Label>
                                    <Form.Control
                                        placeholder="UPI Ref / Approval Code"
                                        value={paymentDetails.reference}
                                        onChange={(e) => setPaymentDetails({...paymentDetails, reference: e.target.value})}
                                    />
                                </Form.Group>
                            )}

                            {/* Audit Info */}
                            <Alert variant="info" className="py-2 small">
                                <User size={14} className="me-1" />
                                Payment will be recorded with your username for audit trail
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                    <Button 
                        variant="success" 
                        onClick={handleCollectPayment}
                        disabled={processing || !paymentMethod}
                    >
                        {processing ? (
                            <><Spinner size="sm" className="me-1" /> Processing...</>
                        ) : (
                            <><CheckCircle size={16} className="me-1" /> Confirm Payment</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LabPaymentsTab;

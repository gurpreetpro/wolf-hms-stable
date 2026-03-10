import React, { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { CreditCard, Banknote, Smartphone, Receipt, CheckCircle, Calculator, Wifi, QrCode } from 'lucide-react';
import api from '../utils/axiosInstance';

const PaymentCollectionModal = ({ show, onHide, prescription, onConfirmPayment, processing }) => {
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [posProcessing, setPosProcessing] = useState(false);
    const [posStatus, setPosStatus] = useState(null); // 'initiated', 'success', 'failed'
    const [posError, setPosError] = useState(null);
    const [paymentLink, setPaymentLink] = useState(null);

    // Calculate amount due (from prescription or default)
    const amountDue = useMemo(() => {
        return prescription?.amount || prescription?.price || 50; // Default amount if not available
    }, [prescription]);

    // Calculate change
    const change = useMemo(() => {
        if (paymentMethod !== 'cash') return 0;
        const tendered = parseFloat(amountTendered) || 0;
        return tendered > amountDue ? tendered - amountDue : 0;
    }, [paymentMethod, amountTendered, amountDue]);

    // Validate form
    const isValid = useMemo(() => {
        if (paymentMethod === 'cash') {
            const tendered = parseFloat(amountTendered) || 0;
            return tendered >= amountDue;
        }
        if (paymentMethod === 'card' || paymentMethod === 'upi') {
            return referenceNumber.trim().length > 0;
        }
        if (paymentMethod === 'pos_card' || paymentMethod === 'pos_upi') {
            return posStatus === 'success';
        }
        return true; // Credit allowed without reference
    }, [paymentMethod, amountTendered, amountDue, referenceNumber, posStatus]);

    // Initiate Razorpay POS Payment
    const initiateRazorpayPayment = async (type) => {
        setPosProcessing(true);
        setPosError(null);
        setPosStatus('initiated');
        setPaymentLink(null);

        try {
            // Call POS initiate endpoint
            const response = await api.post('/api/pos/payment/initiate', {
                invoiceId: prescription?.id || Date.now(),
                amount: amountDue,
                provider: 'razorpay',
                department: 'pharmacy',
                customerName: prescription?.patient_name || 'Patient',
                customerPhone: prescription?.patient_phone,
                paymentType: type // 'card' or 'upi'
            });

            if (response.data.paymentLink) {
                setPaymentLink(response.data.paymentLink);
            }

            setReferenceNumber(response.data.transactionId || response.data.providerTxnId);
            setPosStatus('success');
            setPosProcessing(false);

            // Show QR or payment link
            if (response.data.qrCode || response.data.paymentLink) {
                // Open payment link in new window for customer
                window.open(response.data.paymentLink || response.data.qrCode, '_blank', 'width=500,height=600');
            }

        } catch (error) {
            console.error('POS payment error:', error);
            setPosError(error.response?.data?.message || 'POS payment failed. Please try manual entry.');
            setPosStatus('failed');
            setPosProcessing(false);
        }
    };

    const handleSubmit = () => {
        onConfirmPayment({
            prescription_id: prescription?.id,
            payment_method: paymentMethod,
            amount: amountDue,
            amount_tendered: paymentMethod === 'cash' ? parseFloat(amountTendered) : amountDue,
            change_given: change,
            reference_number: referenceNumber || null,
            notes: notes || null,
            pos_transaction: paymentMethod.startsWith('pos_') ? true : false
        });
    };

    const resetForm = () => {
        setPaymentMethod('cash');
        setAmountTendered('');
        setReferenceNumber('');
        setNotes('');
        setPosProcessing(false);
        setPosStatus(null);
        setPosError(null);
        setPaymentLink(null);
    };

    // Reset when modal closes
    const handleClose = () => {
        resetForm();
        onHide();
    };

    if (!prescription) return null;

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Receipt size={24} />
                    Collect Payment
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {/* Patient & Prescription Info */}
                <div className="bg-light rounded p-3 mb-4">
                    <Row>
                        <Col md={6}>
                            <small className="text-muted">Patient</small>
                            <div className="fw-bold fs-5">{prescription.patient_name}</div>
                        </Col>
                        <Col md={6}>
                            <small className="text-muted">Medication</small>
                            <div className="fw-semibold">{prescription.description}</div>
                        </Col>
                    </Row>
                </div>

                {/* Amount Due - Prominent Display */}
                <div className="text-center mb-4 p-4 border rounded-3 bg-white">
                    <small className="text-muted d-block">Amount Due</small>
                    <div className="display-4 fw-bold text-success">₹{amountDue.toFixed(2)}</div>
                </div>

                {/* Payment Method Selection */}
                <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Payment Method</Form.Label>

                    {/* Manual Payment Options */}
                    <div className="d-flex gap-2 flex-wrap mb-2">
                        <Button
                            variant={paymentMethod === 'cash' ? 'success' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={20} />
                            Cash
                        </Button>
                        <Button
                            variant={paymentMethod === 'card' ? 'primary' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => setPaymentMethod('card')}
                        >
                            <CreditCard size={20} />
                            Card (Manual)
                        </Button>
                        <Button
                            variant={paymentMethod === 'upi' ? 'info' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => setPaymentMethod('upi')}
                        >
                            <Smartphone size={20} />
                            UPI (Manual)
                        </Button>
                        <Button
                            variant={paymentMethod === 'credit' ? 'warning' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => setPaymentMethod('credit')}
                        >
                            <Calculator size={20} />
                            Credit
                        </Button>
                    </div>

                    {/* POS/Razorpay Options */}
                    <div className="d-flex gap-2 flex-wrap">
                        <Button
                            variant={paymentMethod === 'pos_card' ? 'primary' : 'outline-primary'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => {
                                setPaymentMethod('pos_card');
                                initiateRazorpayPayment('card');
                            }}
                            disabled={posProcessing}
                        >
                            <Wifi size={18} />
                            <CreditCard size={18} />
                            POS Card
                            <Badge bg="info" className="ms-1">Razorpay</Badge>
                        </Button>
                        <Button
                            variant={paymentMethod === 'pos_upi' ? 'info' : 'outline-info'}
                            className="d-flex align-items-center gap-2"
                            onClick={() => {
                                setPaymentMethod('pos_upi');
                                initiateRazorpayPayment('upi');
                            }}
                            disabled={posProcessing}
                        >
                            <QrCode size={18} />
                            UPI QR
                            <Badge bg="info" className="ms-1">Razorpay</Badge>
                        </Button>
                    </div>
                </Form.Group>

                {/* POS Processing Status */}
                {posProcessing && (
                    <Alert variant="info" className="d-flex align-items-center gap-2">
                        <Spinner size="sm" />
                        Initiating Razorpay payment... Please wait.
                    </Alert>
                )}

                {posStatus === 'success' && paymentLink && (
                    <Alert variant="success">
                        <CheckCircle size={18} className="me-2" />
                        <strong>Payment Link Generated!</strong>
                        <p className="mb-1 small">A payment window has been opened for the customer.</p>
                        <p className="mb-0 small">Transaction ID: <code>{referenceNumber}</code></p>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(paymentLink, '_blank')}
                        >
                            Reopen Payment Link
                        </Button>
                    </Alert>
                )}

                {posError && (
                    <Alert variant="danger">
                        {posError}
                        <Button
                            variant="outline-danger"
                            size="sm"
                            className="ms-2"
                            onClick={() => {
                                setPosError(null);
                                setPaymentMethod('card');
                            }}
                        >
                            Use Manual Entry
                        </Button>
                    </Alert>
                )}

                {/* Cash-specific fields */}
                {paymentMethod === 'cash' && (
                    <Row className="mb-3 g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Amount Tendered</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Enter amount received"
                                    value={amountTendered}
                                    onChange={(e) => setAmountTendered(e.target.value)}
                                    autoFocus
                                    min={amountDue}
                                    className="fs-5"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Change to Return</Form.Label>
                                <div className="form-control fs-5 bg-light d-flex align-items-center">
                                    <span className={change > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                                        ₹{change.toFixed(2)}
                                    </span>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>
                )}

                {/* Card/UPI reference number */}
                {(paymentMethod === 'card' || paymentMethod === 'upi') && (
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                            {paymentMethod === 'card' ? 'Transaction/Approval Code' : 'UPI Transaction ID'}
                        </Form.Label>
                        <Form.Control
                            type="text"
                            placeholder={paymentMethod === 'card' ? 'Enter last 4 digits or approval code' : 'Enter UPI reference number'}
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                )}

                {/* Credit warning */}
                {paymentMethod === 'credit' && (
                    <Alert variant="warning" className="mb-3">
                        <strong>Credit Payment:</strong> This will be added to the patient's outstanding balance.
                    </Alert>
                )}

                {/* Optional notes */}
                <Form.Group className="mb-3">
                    <Form.Label>Notes (Optional)</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </Form.Group>

                {/* Quick Amount Buttons for Cash */}
                {paymentMethod === 'cash' && (
                    <div className="mb-3">
                        <small className="text-muted d-block mb-2">Quick Select:</small>
                        <div className="d-flex gap-2 flex-wrap">
                            {[50, 100, 200, 500, 1000, 2000].map(amt => (
                                <Button
                                    key={amt}
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => setAmountTendered(amt.toString())}
                                    className={parseFloat(amountTendered) === amt ? 'active' : ''}
                                >
                                    ₹{amt}
                                </Button>
                            ))}
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setAmountTendered(amountDue.toString())}
                            >
                                Exact Amount
                            </Button>
                        </div>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="secondary" onClick={handleClose} disabled={processing || posProcessing}>
                    Cancel
                </Button>
                <Button
                    variant="success"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!isValid || processing || posProcessing}
                    className="px-4"
                >
                    {processing ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} className="me-2" />
                            Collect ₹{amountDue.toFixed(2)} & Print Receipt
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentCollectionModal;


/**
 * PaymentModal Component
 * WOLF HMS - Razorpay Payment Integration
 */

import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge } from 'react-bootstrap';
import { CreditCard, Smartphone, QrCode, Link2, Check, X, Copy, Share2 } from 'lucide-react';
import api from '../utils/axiosInstance';

const PaymentModal = ({ show, onHide, invoice, onPaymentSuccess }) => {
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [qrData, setQrData] = useState(null);
    const [paymentLink, setPaymentLink] = useState(null);
    const [success, setSuccess] = useState(false);

    const balance = invoice ? parseFloat(invoice.total_amount) - parseFloat(invoice.amount_paid || 0) : 0;

    // Initialize Razorpay checkout
    const initRazorpayPayment = async () => {
        setLoading(true);
        setError(null);

        try {
            const payAmount = parseFloat(amount) || balance;

            // Create order
            const orderRes = await api.post('/api/payments/orders', {
                invoice_id: invoice.id,
                amount: payAmount,
                patient_id: invoice.patient_id
            });

            const { options } = orderRes.data;

            // Check if Razorpay is loaded
            if (!window.Razorpay) {
                // Load Razorpay script dynamically
                await loadRazorpayScript();
            }

            // Configure Razorpay
            const rzp = new window.Razorpay({
                ...options,
                handler: async (response) => {
                    await verifyPayment(response);
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                        setError('Payment cancelled');
                    }
                }
            });

            rzp.open();

        } catch (err) {
            console.error('Payment init error:', err);
            setError(err.response?.data?.message || 'Failed to initiate payment');
            setLoading(false);
        }
    };

    // Verify payment after Razorpay checkout
    const verifyPayment = async (response) => {
        try {
            await api.post('/api/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
            });

            setSuccess(true);
            setLoading(false);

            setTimeout(() => {
                onPaymentSuccess && onPaymentSuccess();
                onHide();
            }, 2000);

        } catch (err) {
            console.error('Payment verification error:', err);
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
        }
    };

    // Generate UPI QR Code
    const generateQR = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await api.get(`/payments/qr/${invoice.id}`);
            setQrData(res.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to generate QR code');
            setLoading(false);
        }
    };

    // Create shareable payment link
    const createPaymentLink = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await api.post('/api/payments/link', {
                invoice_id: invoice.id,
                amount: parseFloat(amount) || balance
            });
            setPaymentLink(res.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to create payment link');
            setLoading(false);
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    // Share via WhatsApp
    const shareWhatsApp = (message) => {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Load Razorpay script
    const loadRazorpayScript = () => {
        return new Promise((resolve, reject) => {
            if (document.getElementById('razorpay-script')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.id = 'razorpay-script';
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    };

    const handleClose = () => {
        setError(null);
        setSuccess(false);
        setQrData(null);
        setPaymentLink(null);
        setAmount('');
        onHide();
    };

    if (!invoice) return null;

    return (
        <Modal show={show} onHide={handleClose} fullscreen={true} aria-labelledby="payment-modal">
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <CreditCard className="me-2" size={20} />
                    Payment for Invoice #{invoice.id}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {success ? (
                    <div className="text-center py-5">
                        <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                            style={{ width: 80, height: 80 }}>
                            <Check size={40} />
                        </div>
                        <h4 className="text-success">Payment Successful!</h4>
                        <p className="text-muted">Your payment has been processed successfully.</p>
                    </div>
                ) : (
                    <>
                        {/* Invoice Summary */}
                        <Card className="mb-4 border-0 bg-light">
                            <Card.Body>
                                <Row>
                                    <Col>
                                        <small className="text-muted">Total Amount</small>
                                        <h5>₹{parseFloat(invoice.total_amount).toLocaleString()}</h5>
                                    </Col>
                                    <Col>
                                        <small className="text-muted">Paid</small>
                                        <h5 className="text-success">₹{parseFloat(invoice.amount_paid || 0).toLocaleString()}</h5>
                                    </Col>
                                    <Col>
                                        <small className="text-muted">Balance Due</small>
                                        <h5 className="text-danger">₹{balance.toLocaleString()}</h5>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                <X size={16} className="me-2" />
                                {error}
                            </Alert>
                        )}

                        {/* Amount Input */}
                        <Form.Group className="mb-4">
                            <Form.Label>Payment Amount</Form.Label>
                            <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <Form.Control
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={balance.toString()}
                                    max={balance}
                                />
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setAmount(balance.toString())}
                                >
                                    Full Amount
                                </Button>
                            </div>
                            <Form.Text className="text-muted">
                                Leave blank to pay full balance
                            </Form.Text>
                        </Form.Group>

                        {/* Payment Methods */}
                        <div className="mb-4">
                            <label className="form-label">Payment Method</label>
                            <Row className="g-2">
                                <Col xs={4}>
                                    <Card
                                        className={`text-center cursor-pointer ${paymentMethod === 'razorpay' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                        onClick={() => setPaymentMethod('razorpay')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card.Body className="py-3">
                                            <CreditCard size={24} className={paymentMethod === 'razorpay' ? 'text-primary' : 'text-muted'} />
                                            <div className="small mt-1">Card/UPI/Net</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col xs={4}>
                                    <Card
                                        className={`text-center cursor-pointer ${paymentMethod === 'qr' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                        onClick={() => setPaymentMethod('qr')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card.Body className="py-3">
                                            <QrCode size={24} className={paymentMethod === 'qr' ? 'text-primary' : 'text-muted'} />
                                            <div className="small mt-1">Scan QR</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col xs={4}>
                                    <Card
                                        className={`text-center cursor-pointer ${paymentMethod === 'link' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                        onClick={() => setPaymentMethod('link')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Card.Body className="py-3">
                                            <Link2 size={24} className={paymentMethod === 'link' ? 'text-primary' : 'text-muted'} />
                                            <div className="small mt-1">Share Link</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </div>

                        {/* QR Code Display */}
                        {paymentMethod === 'qr' && (
                            <div className="text-center mb-4">
                                {qrData ? (
                                    <Card className="d-inline-block">
                                        <Card.Body>
                                            <div className="bg-white p-3 border rounded mb-2">
                                                {/* QR Code Image - in production, use a QR library */}
                                                <div className="d-flex align-items-center justify-content-center"
                                                    style={{ width: 200, height: 200, background: '#f8f9fa' }}>
                                                    <QrCode size={100} className="text-muted" />
                                                </div>
                                            </div>
                                            <p className="small text-muted mb-2">Scan with any UPI app</p>
                                            <Badge bg="info">Expires in 30 minutes</Badge>
                                            <div className="mt-3">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => window.open(qrData.upiLink, '_blank')}
                                                >
                                                    <Smartphone size={14} className="me-1" />
                                                    Open in UPI App
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ) : (
                                    <Button variant="outline-primary" onClick={generateQR} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : <QrCode size={16} className="me-2" />}
                                        Generate QR Code
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Payment Link Display */}
                        {paymentMethod === 'link' && (
                            <div className="mb-4">
                                {paymentLink ? (
                                    <Card>
                                        <Card.Body>
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <Form.Control
                                                    value={paymentLink.paymentLink.short_url}
                                                    readOnly
                                                />
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => copyToClipboard(paymentLink.paymentLink.short_url)}
                                                >
                                                    <Copy size={16} />
                                                </Button>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="success"
                                                    onClick={() => shareWhatsApp(paymentLink.shareMessage)}
                                                >
                                                    <Share2 size={16} className="me-2" />
                                                    Share on WhatsApp
                                                </Button>
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={() => copyToClipboard(paymentLink.shareMessage)}
                                                >
                                                    <Copy size={16} className="me-2" />
                                                    Copy Message
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ) : (
                                    <Button variant="outline-primary" onClick={createPaymentLink} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : <Link2 size={16} className="me-2" />}
                                        Create Payment Link
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>

            {!success && (
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    {paymentMethod === 'razorpay' && (
                        <Button
                            variant="primary"
                            onClick={initRazorpayPayment}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={16} className="me-2" />
                                    Pay ₹{(parseFloat(amount) || balance).toLocaleString()}
                                </>
                            )}
                        </Button>
                    )}
                </Modal.Footer>
            )}
        </Modal>
    );
};

export default PaymentModal;

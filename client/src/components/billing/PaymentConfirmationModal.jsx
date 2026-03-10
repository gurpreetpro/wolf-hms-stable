import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge, Card, InputGroup, Spinner } from 'react-bootstrap';
import { CreditCard, Smartphone, Check, AlertCircle, QrCode, Printer, MessageSquare, Percent } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import api from '../../utils/axiosInstance';

/**
 * PaymentConfirmationModal - Reception confirms payment from various sources
 * Now includes Discount Application with Staff Authorization
 */
const PaymentConfirmationModal = ({ show, onHide, invoice, onSuccess }) => {
    // Payment method selection
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        reference: '',
        razorpay_payment_id: '',
        upi_transaction_id: '',
        pos_terminal_id: '',
        pos_approval_code: '',
        remarks: ''
    });

    // Discount State (NEW)
    const [availableDiscounts, setAvailableDiscounts] = useState([]);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [showDiscountSection, setShowDiscountSection] = useState(false);
    
    // Staff Authorization for Discount (NEW)
    const [staffAuth, setStaffAuth] = useState({
        staff_id: '',
        staff_name: '',
        reason: ''
    });

    // Confirmation settings
    const [confirmSettings, setConfirmSettings] = useState({
        auto_sms_on_payment: true,
        auto_print_receipt: false
    });

    // Status
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // POS Terminal Integration State
    const [posDevices, setPosDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [posStatus, setPosStatus] = useState('idle'); // idle | sending | waiting | success | failed
    const [posTransactionId, setPosTransactionId] = useState(null);
    const [posPollingInterval, setPosPollingInterval] = useState(null);
    const [posTimeElapsed, setPosTimeElapsed] = useState(0);

    // Load settings and discounts on mount
    useEffect(() => {
        const savedConfirm = localStorage.getItem('confirmation_settings');
        if (savedConfirm) {
            try {
                const parsed = JSON.parse(savedConfirm);
                if (parsed) setConfirmSettings(parsed);
            } catch (e) {
                console.error('Error parsing confirmation_settings', e);
            }
        }
        
        // Load available discounts from billing_discounts (correct key)
        const savedDiscounts = localStorage.getItem('billing_discounts');
        if (savedDiscounts) {
            try {
                const parsed = JSON.parse(savedDiscounts);
                if (parsed) setAvailableDiscounts(parsed);
            } catch (e) {
                console.error('Error parsing billing_discounts', e);
            }
        }

        // Load POS devices
        loadPosDevices();
    }, []);

    // Load POS devices from API
    const loadPosDevices = async () => {
        try {
            const res = await api.get('/api/pos/devices');
            const devices = res.data?.data || res.data || [];
            setPosDevices(devices.filter(d => d.status === 'active'));
        } catch (err) {
            console.log('POS devices not available:', err.message);
            setPosDevices([]);
        }
    };

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (posPollingInterval) {
                clearInterval(posPollingInterval);
            }
        };
    }, [posPollingInterval]);

    // Send payment to POS terminal
    const handleSendToTerminal = async () => {
        if (!selectedDevice || !paymentDetails.amount) {
            setError('Please select a terminal and enter amount');
            return;
        }

        setPosStatus('sending');
        setPosTimeElapsed(0);
        setError('');

        try {
            const res = await api.post('/api/pos/payment/initiate', {
                deviceId: parseInt(selectedDevice),
                invoiceId: invoice.id,
                amount: parseFloat(paymentDetails.amount),
                paymentMode: paymentMethod === 'pos_card' ? 'card' : 'upi',
                customerPhone: invoice.patient_phone
            });

            const txnId = res.data?.data?.transaction_id || res.data?.transaction_id;
            if (txnId) {
                setPosTransactionId(txnId);
                setPosStatus('waiting');
                startPolling(txnId);
            } else {
                setPosStatus('failed');
                setError('Failed to initiate payment - no transaction ID received');
            }
        } catch (err) {
            console.error('POS initiate error:', err);
            setPosStatus('failed');
            setError(err.response?.data?.message || 'Failed to send to terminal');
        }
    };

    // Start polling for transaction status
    const startPolling = (txnId) => {
        let elapsed = 0;
        const interval = setInterval(async () => {
            elapsed += 2;
            setPosTimeElapsed(elapsed);

            // Timeout after 120 seconds
            if (elapsed >= 120) {
                clearInterval(interval);
                setPosPollingInterval(null);
                setPosStatus('failed');
                setError('Transaction timed out');
                return;
            }

            try {
                const res = await api.get(`/api/pos/payment/${txnId}/status`);
                const status = res.data?.data?.status || res.data?.status;

                if (status === 'success' || status === 'completed') {
                    clearInterval(interval);
                    setPosPollingInterval(null);
                    setPosStatus('success');
                    
                    // Auto-fill the approval code
                    const data = res.data?.data || res.data;
                    setPaymentDetails(prev => ({
                        ...prev,
                        pos_approval_code: data.auth_code || data.approval_code || '',
                        pos_terminal_id: data.terminal_id || selectedDevice
                    }));
                } else if (status === 'failed' || status === 'cancelled') {
                    clearInterval(interval);
                    setPosPollingInterval(null);
                    setPosStatus('failed');
                    setError(res.data?.data?.failure_reason || 'Payment failed');
                }
                // Otherwise keep polling (status is 'pending' or 'processing')
            } catch (err) {
                console.error('Polling error:', err);
                // Don't stop polling on network errors, just log
            }
        }, 2000);

        setPosPollingInterval(interval);
    };

    // Cancel POS transaction
    const handleCancelPosTransaction = async () => {
        if (posPollingInterval) {
            clearInterval(posPollingInterval);
            setPosPollingInterval(null);
        }

        if (posTransactionId) {
            try {
                await api.post(`/api/pos/payment/${posTransactionId}/cancel`);
            } catch (err) {
                console.error('Cancel error:', err);
            }
        }

        setPosStatus('idle');
        setPosTransactionId(null);
        setPosTimeElapsed(0);
    };


    // Reset form when invoice changes
    useEffect(() => {
        if (invoice) {
            const originalAmount = invoice.balance_due || invoice.total_amount || 0;
            setPaymentDetails(prev => ({
                ...prev,
                amount: originalAmount
            }));
            setPaymentMethod('');
            setSelectedDiscount(null);
            setDiscountAmount(0);
            setShowDiscountSection(false);
            setStaffAuth({ staff_id: '', staff_name: '', reason: '' });
            setError('');
            setSuccess('');
            
            // Fetch invoice items (charge breakdown)
            fetchInvoiceItems(invoice.id);
        }
    }, [invoice]);

    // Invoice items for charge breakdown
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const fetchInvoiceItems = async (invoiceId) => {
        if (!invoiceId) return;
        setLoadingItems(true);
        try {
            const res = await api.get(`/api/finance/invoices/${invoiceId}/items`);
            setInvoiceItems(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Error fetching invoice items:', err);
            setInvoiceItems([]);
        } finally {
            setLoadingItems(false);
        }
    };

    // Calculate discount when discount selection changes
    useEffect(() => {
        if (!invoice || !selectedDiscount) {
            setDiscountAmount(0);
            return;
        }
        
        const originalAmount = parseFloat(invoice.balance_due || invoice.total_amount || 0);
        let discount = 0;
        
        if (selectedDiscount.type === 'percentage') {
            discount = (originalAmount * parseFloat(selectedDiscount.value)) / 100;
        } else {
            discount = parseFloat(selectedDiscount.value);
        }
        
        setDiscountAmount(Math.min(discount, originalAmount)); // Can't exceed total
        setPaymentDetails(prev => ({
            ...prev,
            amount: (originalAmount - Math.min(discount, originalAmount)).toFixed(2)
        }));
    }, [selectedDiscount, invoice]);

    const paymentMethods = [
        { id: 'cash', label: '💵 Cash', icon: '💵', color: '#10b981', requiresRef: false },
        { id: 'razorpay', label: '🔵 Razorpay', icon: '💳', color: '#3b82f6', requiresRef: true },
        { id: 'upi', label: '🟢 UPI', icon: '📱', color: '#22c55e', requiresRef: true },
        { id: 'pos_card', label: '💳 POS Card', icon: '🖥️', color: '#8b5cf6', requiresRef: true },
        { id: 'pos_upi', label: '📱 POS UPI', icon: '📲', color: '#f59e0b', requiresRef: true }
    ];

    const handleConfirmPayment = async () => {
        // Validation
        if (!paymentMethod) {
            setError('Please select a payment method');
            return;
        }
        if (!paymentDetails.amount || parseFloat(paymentDetails.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Discount requires staff authorization
        if (selectedDiscount && discountAmount > 0) {
            if (!staffAuth.staff_id || !staffAuth.staff_name) {
                setError('⚠️ Staff ID and Name are required to apply discount');
                return;
            }
        }

        const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
        if (selectedMethod?.requiresRef) {
            const hasRef = paymentDetails.reference || 
                           paymentDetails.razorpay_payment_id || 
                           paymentDetails.upi_transaction_id ||
                           paymentDetails.pos_approval_code;
            if (!hasRef) {
                setError('Transaction reference/ID is required for this payment method');
                return;
            }
        }

        setSubmitting(true);
        setError('');

        try {
            // Record payment via API
            const response = await api.post(`/api/finance/invoices/${invoice.id}/payments`, {
                amount: parseFloat(paymentDetails.amount),
                payment_method: paymentMethod,
                reference_number: getReference(),
                remarks: paymentDetails.remarks
            });

            // Log payment confirmation with discount audit trail
            const paymentLog = {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                patient_name: invoice.patient_name,
                original_amount: invoice.balance_due || invoice.total_amount,
                discount_applied: discountAmount > 0 ? {
                    discount_name: selectedDiscount?.name,
                    discount_type: selectedDiscount?.type,
                    discount_value: selectedDiscount?.value,
                    discount_amount: discountAmount,
                    authorized_by: {
                        staff_id: staffAuth.staff_id,
                        staff_name: staffAuth.staff_name,
                        reason: staffAuth.reason
                    }
                } : null,
                final_amount: parseFloat(paymentDetails.amount),
                method: paymentMethod,
                reference: getReference(),
                confirmed_at: new Date().toISOString(),
                confirmed_by: 'Reception' // Could be dynamic based on logged-in user
            };

            let logs = [];
            try {
                const stored = localStorage.getItem('payment_confirmations');
                if (stored && stored !== 'undefined') {
            try {
                logs = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing payment_logs:', e);
                logs = [];
            }
        }
            } catch (e) {
                console.error('Error parsing payment_confirmations', e);
            }
            logs.push(paymentLog);
            localStorage.setItem('payment_confirmations', JSON.stringify(logs));

            // Handle auto-SMS via API
            if (confirmSettings.auto_sms_on_payment && invoice.patient_phone) {
                try {
                    // Get hospital name from settings
                    let hospitalSettings = {};
                    try {
                        const stored = localStorage.getItem('hospital_settings');
                        if (stored && stored !== 'undefined') {
            try {
                hospitalSettings = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing hospital_profile:', e);
            }
        }
                    } catch(e) { console.error('Error parsing hospital_settings', e); }
                    const hospitalName = hospitalSettings.name || 'Hospital';

                    // Call SMS API
                    await api.post('/api/sms/payment-confirmation', {
                        patient_name: invoice.patient_name,
                        patient_phone: invoice.patient_phone,
                        invoice_id: invoice.id,
                        amount: paymentDetails.amount,
                        hospital_name: hospitalName
                    });
                    console.log('✅ SMS sent successfully');
                } catch (smsError) {
                    console.warn('SMS sending failed, logged to queue:', smsError);
                    // Fallback: Log to localStorage queue for later
                    const smsLog = {
                        invoice_id: invoice.id,
                        patient_name: invoice.patient_name,
                        patient_phone: invoice.patient_phone,
                        amount: paymentDetails.amount,
                        type: 'payment_confirmation',
                        status: 'queued',
                        error: smsError.message,
                        created_at: new Date().toISOString()
                    };
                    let smsLogs = [];
                    try {
                        const stored = localStorage.getItem('sms_queue');
                        if (stored && stored !== 'undefined') {
                try {
                    smsLogs = JSON.parse(stored);
                } catch (e) {
                    console.error('Error parsing sms_logs:', e);
                }
            }
                    } catch (e) { console.error('Error parsing sms_queue', e); }
                    smsLogs.push(smsLog);
                    localStorage.setItem('sms_queue', JSON.stringify(smsLogs));
                }
            }

            setSuccess(`✅ Payment of ${formatCurrency(paymentDetails.amount)} confirmed via ${selectedMethod?.label}!`);
            
            setTimeout(() => {
                if (confirmSettings.auto_print_receipt) {
                    window.print();
                }
                onSuccess && onSuccess(response.data);
                handleClose();
            }, 1500);

        } catch (err) {
            console.error('Payment confirmation error:', err);
            setError(err.response?.data?.message || 'Failed to confirm payment');
        } finally {
            setSubmitting(false);
        }
    };

    const getReference = () => {
        switch(paymentMethod) {
            case 'razorpay': return paymentDetails.razorpay_payment_id;
            case 'upi': return paymentDetails.upi_transaction_id;
            case 'pos_card':
            case 'pos_upi': return paymentDetails.pos_approval_code;
            default: return paymentDetails.reference || 'CASH';
        }
    };

    const handleClose = () => {
        setPaymentMethod('');
        setPaymentDetails({
            amount: '',
            reference: '',
            razorpay_payment_id: '',
            upi_transaction_id: '',
            pos_terminal_id: '',
            pos_approval_code: '',
            remarks: ''
        });
        setError('');
        setSuccess('');
        onHide();
    };

    if (!invoice) return null;

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Check size={24} /> Confirm Payment
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                {success && <Alert variant="success" className="py-2">{success}</Alert>}

                {/* Invoice Summary with Enhanced Patient Profile */}
                <Card className="mb-4 border-0 bg-light">
                    <Card.Body className="py-3">
                        <Row className="mb-2">
                            <Col md={3}>
                                <div className="small text-muted">Invoice #</div>
                                <div className="fw-bold">{invoice.invoice_number || `#${invoice.id}`}</div>
                            </Col>
                            <Col md={5}>
                                <div className="small text-muted">Patient</div>
                                <div className="fw-bold">{invoice.patient_name}</div>
                                <div className="small text-muted">
                                    {invoice.patient_number && <span>📞 {invoice.patient_number}</span>}
                                    {invoice.gender && <span className="ms-2">({invoice.gender})</span>}
                                </div>
                            </Col>
                            <Col md={2}>
                                <div className="small text-muted">Total Amount</div>
                                <div className="fw-bold text-primary fs-5">{formatCurrency(invoice.total_amount)}</div>
                            </Col>
                            <Col md={2}>
                                <div className="small text-muted">Balance Due</div>
                                <div className="fw-bold text-danger fs-5">{formatCurrency(invoice.balance_due || invoice.total_amount)}</div>
                            </Col>
                        </Row>
                        {/* Ward & Admission Info (if available) */}
                        {(invoice.ward || invoice.bed_number || invoice.admission_date) && (
                            <Row className="border-top pt-2 mt-2">
                                <Col>
                                    <div className="small">
                                        {invoice.ward && <Badge bg="info" className="me-2">🏥 {invoice.ward}</Badge>}
                                        {invoice.bed_number && <Badge bg="secondary" className="me-2">🛏️ {invoice.bed_number}</Badge>}
                                        {invoice.admission_date && (
                                            <span className="text-muted">
                                                Admitted: {new Date(invoice.admission_date).toLocaleDateString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        )}
                    </Card.Body>
                </Card>

                {/* Charge Breakdown - What the charges are for */}
                <Card className="mb-4 border-info">
                    <Card.Header className="bg-info bg-opacity-10 py-2">
                        <span className="fw-bold">📋 What are the charges for?</span>
                    </Card.Header>
                    <Card.Body className="py-2">
                        {loadingItems ? (
                            <div className="text-center py-2">
                                <Spinner size="sm" /> Loading charges...
                            </div>
                        ) : invoiceItems.length > 0 ? (
                            <table className="table table-sm mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Description</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-end">Rate</th>
                                        <th className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.description || item.name}</td>
                                            <td className="text-center">{item.quantity || 1}</td>
                                            <td className="text-end">{formatCurrency(item.unit_price || 0)}</td>
                                            <td className="text-end fw-bold">{formatCurrency(item.total_price || (item.quantity * item.unit_price) || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-muted small text-center py-2">
                                No itemized charges available
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Discount Application Section (NEW) */}
                <Card className="mb-4 border-warning">
                    <Card.Header className="bg-warning bg-opacity-10 py-2 d-flex justify-content-between align-items-center">
                        <span className="fw-bold d-flex align-items-center gap-2">
                            <Percent size={16} /> Apply Discount
                        </span>
                        <Form.Check
                            type="switch"
                            id="show-discount"
                            checked={showDiscountSection}
                            onChange={(e) => {
                                setShowDiscountSection(e.target.checked);
                                if (!e.target.checked) {
                                    setSelectedDiscount(null);
                                    setStaffAuth({ staff_id: '', staff_name: '', reason: '' });
                                }
                            }}
                            label={showDiscountSection ? <Badge bg="success">Enabled</Badge> : <Badge bg="secondary">Disabled</Badge>}
                        />
                    </Card.Header>
                    {showDiscountSection && (
                        <Card.Body>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Select Discount *</Form.Label>
                                        <Form.Select
                                            value={selectedDiscount?.id?.toString() || ''}
                                            onChange={(e) => {
                                                const discount = availableDiscounts.find(d => String(d.id) === e.target.value);
                                                setSelectedDiscount(discount || null);
                                            }}
                                        >
                                            <option value="">-- Select Discount Type --</option>
                                            {availableDiscounts.map((d, idx) => (
                                                <option key={d.id || idx} value={String(d.id || idx)}>
                                                    {d.name} ({d.type === 'percentage' ? `${d.value}%` : `₹${d.value}`})
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    {selectedDiscount && (
                                        <div className="bg-success bg-opacity-10 rounded p-3 text-center">
                                            <div className="small text-muted">Discount Amount</div>
                                            <div className="fw-bold text-success fs-4">- {formatCurrency(discountAmount)}</div>
                                            <div className="small">
                                                New Total: <strong className="text-primary">{formatCurrency(paymentDetails.amount)}</strong>
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                            
                            {/* Staff Authorization - REQUIRED for discount */}
                            {selectedDiscount && (
                                <>
                                    <hr />
                                    <Alert variant="info" className="py-2 mb-3">
                                        <AlertCircle size={14} className="me-1" />
                                        <strong>Staff Authorization Required</strong> - Discount cannot be applied without staff ID
                                    </Alert>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Staff ID *</Form.Label>
                                                <Form.Control
                                                    placeholder="Enter Staff ID"
                                                    value={staffAuth.staff_id}
                                                    onChange={(e) => setStaffAuth({...staffAuth, staff_id: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Staff Name *</Form.Label>
                                                <Form.Control
                                                    placeholder="Enter Name"
                                                    value={staffAuth.staff_name}
                                                    onChange={(e) => setStaffAuth({...staffAuth, staff_name: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Reason for Discount</Form.Label>
                                                <Form.Control
                                                    placeholder="e.g., BPL verification done"
                                                    value={staffAuth.reason}
                                                    onChange={(e) => setStaffAuth({...staffAuth, reason: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </Card.Body>
                    )}
                </Card>

                {/* Payment Method Selection */}
                <h6 className="fw-bold mb-3">💳 Select Payment Method</h6>
                <Row className="g-2 mb-4">
                    {paymentMethods.map(method => (
                        <Col key={method.id} xs={6} md={4} lg>
                            <Card 
                                className={`text-center cursor-pointer h-100 ${paymentMethod === method.id ? 'border-2' : ''}`}
                                style={{ 
                                    cursor: 'pointer',
                                    borderColor: paymentMethod === method.id ? method.color : '#dee2e6',
                                    backgroundColor: paymentMethod === method.id ? `${method.color}15` : 'white'
                                }}
                                onClick={() => setPaymentMethod(method.id)}
                            >
                                <Card.Body className="py-3 px-2">
                                    <div className="fs-3 mb-1">{method.icon}</div>
                                    <div className="small fw-semibold">{method.label.split(' ')[1]}</div>
                                    {paymentMethod === method.id && (
                                        <Badge bg="success" className="mt-1">✓</Badge>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Payment Details Form */}
                {paymentMethod && (
                    <Card className="mb-4">
                        <Card.Header className="bg-white py-2">
                            <span className="fw-bold">📝 Payment Details</span>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Amount Received *</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>₹</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                value={paymentDetails.amount}
                                                onChange={(e) => setPaymentDetails({...paymentDetails, amount: e.target.value})}
                                                placeholder="0.00"
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </Col>

                                {/* Razorpay specific */}
                                {paymentMethod === 'razorpay' && (
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Razorpay Payment ID *</Form.Label>
                                            <Form.Control
                                                placeholder="pay_xxxxxxxxxx"
                                                value={paymentDetails.razorpay_payment_id}
                                                onChange={(e) => setPaymentDetails({...paymentDetails, razorpay_payment_id: e.target.value})}
                                            />
                                            <Form.Text className="text-muted">From Razorpay Dashboard</Form.Text>
                                        </Form.Group>
                                    </Col>
                                )}

                                {/* UPI specific */}
                                {paymentMethod === 'upi' && (
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">UPI Transaction ID *</Form.Label>
                                            <Form.Control
                                                placeholder="e.g., 123456789012"
                                                value={paymentDetails.upi_transaction_id}
                                                onChange={(e) => setPaymentDetails({...paymentDetails, upi_transaction_id: e.target.value})}
                                            />
                                            <Form.Text className="text-muted">12-digit UTR from patient's app</Form.Text>
                                        </Form.Group>
                                    </Col>
                                )}

                                {/* POS specific */}
                                {(paymentMethod === 'pos_card' || paymentMethod === 'pos_upi') && (
                                    <>
                                        {/* Terminal Selection & Send Button */}
                                        <Col md={12} className="mb-3">
                                            <Card className="border-primary bg-primary bg-opacity-10">
                                                <Card.Body className="py-3">
                                                    <Row className="align-items-center g-3">
                                                        <Col md={5}>
                                                            <Form.Group>
                                                                <Form.Label className="small fw-bold">📟 Select POS Terminal</Form.Label>
                                                                <Form.Select
                                                                    value={selectedDevice}
                                                                    onChange={(e) => setSelectedDevice(e.target.value)}
                                                                    disabled={posStatus === 'waiting'}
                                                                >
                                                                    <option value="">-- Select Terminal --</option>
                                                                    {posDevices.map(device => (
                                                                        <option key={device.id} value={device.id}>
                                                                            {device.device_name} ({device.location || 'No location'})
                                                                        </option>
                                                                    ))}
                                                                </Form.Select>
                                                            </Form.Group>
                                                        </Col>
                                                        <Col md={4}>
                                                            <Button
                                                                variant="primary"
                                                                className="w-100 fw-bold"
                                                                disabled={!selectedDevice || posStatus === 'waiting' || posStatus === 'sending'}
                                                                onClick={handleSendToTerminal}
                                                                style={{ height: '46px', marginTop: '24px' }}
                                                            >
                                                                {posStatus === 'sending' && <Spinner size="sm" className="me-2" />}
                                                                {posStatus === 'waiting' && <Spinner size="sm" className="me-2" />}
                                                                {posStatus === 'idle' && '📤 Send to Terminal'}
                                                                {posStatus === 'sending' && 'Sending...'}
                                                                {posStatus === 'waiting' && `Waiting... (${posTimeElapsed}s)`}
                                                                {posStatus === 'success' && '✅ Received!'}
                                                                {posStatus === 'failed' && '❌ Failed'}
                                                            </Button>
                                                        </Col>
                                                        <Col md={3}>
                                                            {posStatus === 'waiting' && (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    className="w-100"
                                                                    onClick={handleCancelPosTransaction}
                                                                    style={{ height: '46px', marginTop: '24px' }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            )}
                                                        </Col>
                                                    </Row>
                                                    {posStatus === 'waiting' && (
                                                        <Alert variant="info" className="mt-3 mb-0 py-2 text-center">
                                                            <strong>⏳ Waiting for customer payment on terminal...</strong>
                                                            <br/>
                                                            <small>The terminal will display ₹{paymentDetails.amount} - Customer can pay by Card/UPI</small>
                                                        </Alert>
                                                    )}
                                                    {posStatus === 'success' && (
                                                        <Alert variant="success" className="mt-3 mb-0 py-2">
                                                            ✅ <strong>Payment received from terminal!</strong> Approval code auto-filled below.
                                                        </Alert>
                                                    )}
                                                    {posStatus === 'failed' && (
                                                        <Alert variant="danger" className="mt-3 mb-0 py-2">
                                                            ❌ Payment failed or cancelled. You can try again or enter details manually.
                                                        </Alert>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        
                                        {/* Manual entry fields (can be auto-filled by POS) */}
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Approval Code *</Form.Label>
                                                <Form.Control
                                                    placeholder="e.g., 123456"
                                                    value={paymentDetails.pos_approval_code}
                                                    onChange={(e) => setPaymentDetails({...paymentDetails, pos_approval_code: e.target.value})}
                                                    className={posStatus === 'success' ? 'border-success' : ''}
                                                />
                                                <Form.Text className="text-muted">
                                                    {posStatus === 'success' ? '✅ Auto-filled from terminal' : 'From POS slip or auto-filled'}
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Terminal ID</Form.Label>
                                                <Form.Control
                                                    placeholder="TID-XXXXX"
                                                    value={paymentDetails.pos_terminal_id}
                                                    onChange={(e) => setPaymentDetails({...paymentDetails, pos_terminal_id: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </>
                                )}

                                {/* Cash - optional reference */}
                                {paymentMethod === 'cash' && (
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Receipt Number (Optional)</Form.Label>
                                            <Form.Control
                                                placeholder="Manual receipt #"
                                                value={paymentDetails.reference}
                                                onChange={(e) => setPaymentDetails({...paymentDetails, reference: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                )}

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Remarks (Optional)</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            placeholder="Any additional notes..."
                                            value={paymentDetails.remarks}
                                            onChange={(e) => setPaymentDetails({...paymentDetails, remarks: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                )}

                {/* Confirmation Options */}
                <Card className="border-0 bg-light">
                    <Card.Body className="py-3">
                        <div className="d-flex flex-wrap gap-4">
                            <Form.Check
                                type="switch"
                                id="auto-sms"
                                label={<span><MessageSquare size={14} className="me-1" />Send SMS confirmation</span>}
                                checked={confirmSettings.auto_sms_on_payment}
                                onChange={(e) => setConfirmSettings({...confirmSettings, auto_sms_on_payment: e.target.checked})}
                            />
                            <Form.Check
                                type="switch"
                                id="auto-print"
                                label={<span><Printer size={14} className="me-1" />Print receipt</span>}
                                checked={confirmSettings.auto_print_receipt}
                                onChange={(e) => setConfirmSettings({...confirmSettings, auto_print_receipt: e.target.checked})}
                            />
                        </div>
                    </Card.Body>
                </Card>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="success" 
                    onClick={handleConfirmPayment}
                    disabled={!paymentMethod || submitting}
                    className="px-4 fw-bold"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                >
                    {submitting ? <Spinner size="sm" /> : <Check size={18} className="me-1" />}
                    Confirm Payment
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentConfirmationModal;

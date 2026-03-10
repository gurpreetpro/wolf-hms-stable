import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, InputGroup, Alert, Table, Row, Col, Spinner, Badge, Card } from 'react-bootstrap';
import { FileText, Search, User, Plus, Trash2, Package, IndianRupee, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import api from '../../utils/axiosInstance';

/**
 * NewInvoiceModal - Complete invoice creation with patient search, services, and packages
 */
const NewInvoiceModal = ({ show, onHide, onSuccess }) => {
    // Patient search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Services & Packages from localStorage
    const [services, setServices] = useState([]);
    const [packages, setPackages] = useState([]);
    const [discounts, setDiscounts] = useState([]);

    // Invoice line items
    const [lineItems, setLineItems] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [selectedPackage, setSelectedPackage] = useState('');

    // Discount
    const [applyDiscount, setApplyDiscount] = useState('');
    const [manualDiscount, setManualDiscount] = useState(0);

    // Insurance & Split Billing
    const [insuranceProviders, setInsuranceProviders] = useState([]);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [claimAmount, setClaimAmount] = useState(0);

    // Status
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Load services, packages, discounts from localStorage
    useEffect(() => {
        if (show) {
            const savedServices = localStorage.getItem('billing_services');
            const savedPackages = localStorage.getItem('billing_packages');
            const savedDiscounts = localStorage.getItem('billing_discounts');

            try {
                setServices(savedServices && savedServices !== 'undefined' ? JSON.parse(savedServices) : []);
            } catch (e) { console.error(e); setServices([]); }

            try {
                setPackages(savedPackages && savedPackages !== 'undefined' ? JSON.parse(savedPackages) : []);
            } catch (e) { console.error(e); setPackages([]); }

            try {
                setDiscounts(savedDiscounts && savedDiscounts !== 'undefined' ? JSON.parse(savedDiscounts) : []);
            } catch (e) { console.error(e); setDiscounts([]); }
            
            // Fetch Insurance Providers
            api.get('/api/insurance/providers')
                .then(res => setInsuranceProviders(res.data?.providers || []))
                .catch(err => console.error('Error fetching insurance providers:', err));
        }
    }, [show]);

    // Patient search
    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await api.get(`/api/patients/search?q=${encodeURIComponent(term)}`);
            setSearchResults(res.data?.slice(0, 5) || []);
        } catch (err) {
            console.error('Patient search error:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm('');
        setSearchResults([]);

        // Auto-apply discount rules
        if (patient.age && patient.age >= 60) {
            const seniorDiscount = discounts.find(d => d.applicable_to === 'age_above_60');
            if (seniorDiscount) {
                setApplyDiscount(seniorDiscount.id.toString());
            }
        }
    };

    // Add service as line item
    const handleAddService = () => {
        if (!selectedService) return;
        const service = services.find(s => s.id.toString() === selectedService);
        if (!service) return;

        const newItem = {
            id: Date.now(),
            code: service.code,
            description: service.name,
            quantity: 1,
            unit_price: service.base_rate,
            gst: service.gst_percentage,
            total: service.base_rate * (1 + service.gst_percentage / 100)
        };

        setLineItems([...lineItems, newItem]);
        setSelectedService('');
    };

    // Add package as multiple line items
    const handleAddPackage = () => {
        if (!selectedPackage) return;
        const pkg = packages.find(p => p.id.toString() === selectedPackage);
        if (!pkg) return;

        const newItem = {
            id: Date.now(),
            code: 'PKG',
            description: `Package: ${pkg.name}`,
            quantity: 1,
            unit_price: pkg.total_amount,
            gst: 0,
            total: pkg.total_amount,
            isPackage: true,
            inclusions: pkg.inclusions
        };

        setLineItems([...lineItems, newItem]);
        setSelectedPackage('');
    };

    // Remove line item
    const handleRemoveItem = (id) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    // Update quantity
    const handleUpdateQuantity = (id, qty) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const quantity = Math.max(1, parseInt(qty) || 1);
                return {
                    ...item,
                    quantity,
                    total: item.unit_price * quantity * (1 + (item.gst || 0) / 100)
                };
            }
            return item;
        }));
    };

    // Calculate totals
    const getSubtotal = () => lineItems.reduce((sum, item) => sum + item.total, 0);

    const getDiscountAmount = () => {
        const subtotal = getSubtotal();
        if (manualDiscount > 0) {
            return (subtotal * manualDiscount) / 100;
        }
        if (applyDiscount) {
            const discount = discounts.find(d => d.id.toString() === applyDiscount);
            if (discount) {
                if (discount.type === 'percentage') {
                    return (subtotal * discount.value) / 100;
                }
                return discount.value;
            }
        }
        return 0;
    };

    const getGrandTotal = () => getSubtotal() - getDiscountAmount();

    // Submit invoice
    const handleSubmit = async () => {
        if (!selectedPatient) {
            setError('Please select a patient');
            return;
        }
        if (lineItems.length === 0) {
            setError('Please add at least one service or package');
            return;
        }

        setSubmitting(true);
        setError('');

        const grandTotal = getGrandTotal();
        const patientShare = paymentMode === 'Insurance' ? Math.max(0, grandTotal - claimAmount) : grandTotal;

        try {
            const invoiceData = {
                patient_id: selectedPatient.id,
                patient_name: selectedPatient.name,
                patient_phone: selectedPatient.phone,
                total_amount: grandTotal,
                subtotal: getSubtotal(),
                discount_amount: getDiscountAmount(),
                discount_type: applyDiscount ? 'rule' : (manualDiscount > 0 ? 'manual' : 'none'),
                status: 'Pending',
                // Split Billing Data
                payment_mode: paymentMode,
                insurance_provider_id: paymentMode === 'Insurance' ? selectedProvider : null,
                insurance_claim_amount: paymentMode === 'Insurance' ? claimAmount : 0,
                patient_payable_share: patientShare,
                items: lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total
                }))
            };

            await api.post('/api/finance/generate', invoiceData);

            setSuccess('Invoice created successfully!');
            setTimeout(() => {
                setSuccess('');
                handleClose();
                if (onSuccess) onSuccess();
            }, 2000);

        } catch (err) {
            console.error('Invoice creation error:', err);
            setError(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedPatient(null);
        setSearchTerm('');
        setSearchResults([]);
        setLineItems([]);
        setSelectedService('');
        setSelectedPackage('');
        setApplyDiscount('');
        setManualDiscount(0);
        setError('');
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <FileText size={20} /> Create New Invoice
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {success && <Alert variant="success" className="py-2">{success}</Alert>}
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <Row>
                    {/* Left: Patient & Items */}
                    <Col md={8}>
                        {/* Patient Selection */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold"><User size={16} className="me-1" />Patient *</Form.Label>
                            {selectedPatient ? (
                                <Alert variant="success" className="py-2 d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong>{selectedPatient.name}</strong>
                                        {selectedPatient.phone && <span className="ms-2 text-muted">({selectedPatient.phone})</span>}
                                        {selectedPatient.age && <Badge bg="info" className="ms-2">{selectedPatient.age} yrs</Badge>}
                                    </span>
                                    <Button variant="outline-danger" size="sm" onClick={() => setSelectedPatient(null)}>Change</Button>
                                </Alert>
                            ) : (
                                <div className="position-relative">
                                    <InputGroup>
                                        <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                        <Form.Control 
                                            placeholder="Search patient by name or phone..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                        {searching && <InputGroup.Text><Spinner size="sm" /></InputGroup.Text>}
                                    </InputGroup>
                                    {searchResults.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1000 }}>
                                            {searchResults.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className="p-2 border-bottom"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleSelectPatient(p)}
                                                >
                                                    <strong>{p.name}</strong>
                                                    <span className="text-muted ms-2">{p.phone}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Form.Group>

                        {/* Add Service */}
                        <Row className="mb-3">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label><IndianRupee size={14} className="me-1" />Add Service</Form.Label>
                                    <Form.Select value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                                        <option value="">Select a service...</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} - {formatCurrency(s.base_rate)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4} className="d-flex align-items-end">
                                <Button variant="outline-primary" onClick={handleAddService} disabled={!selectedService} className="w-100">
                                    <Plus size={16} /> Add
                                </Button>
                            </Col>
                        </Row>

                        {/* Add Package */}
                        <Row className="mb-3">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label><Package size={14} className="me-1" />Add Package</Form.Label>
                                    <Form.Select value={selectedPackage} onChange={e => setSelectedPackage(e.target.value)}>
                                        <option value="">Select a package...</option>
                                        {packages.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} - {formatCurrency(p.total_amount)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4} className="d-flex align-items-end">
                                <Button variant="outline-success" onClick={handleAddPackage} disabled={!selectedPackage} className="w-100">
                                    <Plus size={16} /> Add
                                </Button>
                            </Col>
                        </Row>

                        {/* Line Items Table */}
                        <Table bordered size="sm">
                            <thead className="bg-light">
                                <tr>
                                    <th>Description</th>
                                    <th style={{ width: '80px' }}>Qty</th>
                                    <th style={{ width: '100px' }}>Rate</th>
                                    <th style={{ width: '100px' }}>Amount</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center text-muted py-3">Add services or packages above</td></tr>
                                ) : lineItems.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.description}
                                            {item.isPackage && (
                                                <div className="small text-muted">
                                                    Includes: {item.inclusions?.slice(0, 3).join(', ')}...
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <Form.Control 
                                                type="number" 
                                                size="sm" 
                                                value={item.quantity}
                                                onChange={e => handleUpdateQuantity(item.id, e.target.value)}
                                                min="1"
                                                disabled={item.isPackage}
                                            />
                                        </td>
                                        <td className="text-end">{formatCurrency(item.unit_price)}</td>
                                        <td className="text-end fw-bold">{formatCurrency(item.total)}</td>
                                        <td className="text-center">
                                            <Button variant="link" size="sm" className="text-danger p-0" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Col>

                    {/* Right: Summary */}
                    <Col md={4}>
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-light">
                                <h6 className="mb-0">Invoice Summary</h6>
                            </Card.Header>
                            <Card.Body>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(getSubtotal())}</span>
                                </div>

                                {/* Discount Selection */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="small">Discount</Form.Label>
                                    <Form.Select size="sm" value={applyDiscount} onChange={e => { setApplyDiscount(e.target.value); setManualDiscount(0); }}>
                                        <option value="">No discount</option>
                                        {discounts.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)})
                                            </option>
                                        ))}
                                        <option value="manual">Manual %</option>
                                    </Form.Select>
                                    {applyDiscount === 'manual' && (
                                        <InputGroup size="sm" className="mt-2">
                                            <Form.Control 
                                                type="number" 
                                                value={manualDiscount}
                                                onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                            />
                                            <InputGroup.Text>%</InputGroup.Text>
                                        </InputGroup>
                                    )}
                                </Form.Group>

                                {getDiscountAmount() > 0 && (
                                    <div className="d-flex justify-content-between mb-2 text-success">
                                        <span>Discount:</span>
                                        <span>-{formatCurrency(getDiscountAmount())}</span>
                                    </div>
                                )}

                                <hr />
                                <div className="d-flex justify-content-between fw-bold fs-5">
                                    <span>Total:</span>
                                    <span className="text-primary">{formatCurrency(getGrandTotal())}</span>
                                </div>

                                <hr />
                                {/* Payment Mode - Phase 5 Split Billing */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Payment Mode</Form.Label>
                                    <Form.Select 
                                        size="sm" 
                                        value={paymentMode} 
                                        onChange={e => setPaymentMode(e.target.value)}
                                    >
                                        <option value="Cash">Cash (Self Pay)</option>
                                        <option value="Insurance">Insurance (Split Billing)</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="UPI">UPI</option>
                                    </Form.Select>
                                </Form.Group>

                                {paymentMode === 'Insurance' && (
                                    <div className="bg-light p-2 rounded mb-3 border">
                                        <h6 className="small fw-bold text-primary mb-2">Insurance Details</h6>
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small">Provider</Form.Label>
                                            <Form.Select 
                                                size="sm"
                                                value={selectedProvider} 
                                                onChange={e => setSelectedProvider(e.target.value)}
                                            >
                                                <option value="">Select Provider...</option>
                                                {insuranceProviders.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small">Claim Amount</Form.Label>
                                            <InputGroup size="sm">
                                                <InputGroup.Text>₹</InputGroup.Text>
                                                <Form.Control 
                                                    type="number"
                                                    value={claimAmount}
                                                    onChange={e => setClaimAmount(parseFloat(e.target.value) || 0)}
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                        <div className="d-flex justify-content-between small fw-bold">
                                            <span>Patient Pay:</span>
                                            <span className="text-danger">
                                                {formatCurrency(Math.max(0, getGrandTotal() - claimAmount))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="primary" 
                    onClick={handleSubmit} 
                    disabled={!selectedPatient || lineItems.length === 0 || submitting}
                >
                    {submitting ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                    Generate Invoice
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default NewInvoiceModal;

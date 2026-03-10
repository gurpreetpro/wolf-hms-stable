import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, InputGroup, Alert, Table, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { RotateCcw, Check, Clock, X, AlertCircle, Search, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import api from '../../utils/axiosInstance';

/**
 * RefundModal - Process refunds with invoice/patient selection
 */
const RefundModal = ({ show, onHide, invoice, onSuccess }) => {

    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [refunds, setRefunds] = useState([]);
    const [mode, setMode] = useState('new');
    
    // Invoice search state
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceResults, setInvoiceResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    
    const [form, setForm] = useState({
        amount: '',
        reason: '',
        refund_mode: 'Same as payment',
        account_details: ''
    });

    useEffect(() => {
        if (show) {
            loadRefunds();
            if (invoice) {
                setSelectedInvoice(invoice);
                setForm(prev => ({
                    ...prev,
                    amount: invoice.amount_paid || invoice.total_amount
                }));
            }
        }
    }, [show, invoice]);

    const loadRefunds = () => {
        let all = [];
        try {
            const stored = localStorage.getItem('billing_refunds');
            if (stored && stored !== 'undefined') {
                try {
                    all = JSON.parse(stored);
                } catch (e) {
                    console.error('Error parsing invoices:', e);
                }
            }
        } catch(e) { console.error(e); }
        setRefunds(all);
    };

    // Search invoices
    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 1) {
            setInvoiceResults([]);
            return;
        }
        
        setSearching(true);
        try {
            const res = await api.get('/api/finance/invoices');
            const invoices = res.data || [];
            // Filter by patient name or invoice number
            const filtered = invoices.filter(inv => 
                inv.patient_name?.toLowerCase().includes(term.toLowerCase()) ||
                inv.invoice_number?.toLowerCase().includes(term.toLowerCase()) ||
                inv.id?.toString().includes(term)
            ).slice(0, 5);
            setInvoiceResults(filtered);
        } catch (err) {
            console.error('Invoice search error:', err);
            setInvoiceResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectInvoice = (inv) => {
        setSelectedInvoice(inv);
        setSearchTerm('');
        setInvoiceResults([]);
        setForm(prev => ({
            ...prev,
            amount: inv.amount_paid || inv.total_amount
        }));
    };

    const handleClearInvoice = () => {
        setSelectedInvoice(null);
        setForm(prev => ({ ...prev, amount: '' }));
    };

    const handleSubmit = () => {
        if (!selectedInvoice) {
            setError('Please select an invoice');
            return;
        }
        if (!form.amount || parseFloat(form.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (!form.reason) {
            setError('Please provide a reason for refund');
            return;
        }

        const newRefund = {
            id: Date.now(),
            invoice_id: selectedInvoice.id,
            invoice_number: selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`,
            patient_name: selectedInvoice.patient_name || 'Unknown',
            amount: parseFloat(form.amount),
            reason: form.reason,
            refund_mode: form.refund_mode,
            account_details: form.account_details,
            status: 'pending_approval',
            requested_at: new Date().toISOString(),
            requested_by: localStorage.getItem('userName') || 'Staff',
            refund_number: `REF-${Date.now().toString().slice(-8)}`
        };

        let all = [];
        try {
            const stored = localStorage.getItem('billing_refunds');
            if (stored && stored !== 'undefined') {
                try {
                    all = JSON.parse(stored);
                } catch (e) {
                   console.error('Error parsing invoices:', e);
                }
            }
        } catch(e) { console.error(e); }
        all.push(newRefund);
        localStorage.setItem('billing_refunds', JSON.stringify(all));

        setSuccess(`Refund request ${newRefund.refund_number} submitted for ${selectedInvoice.patient_name}`);
        setForm({ amount: '', reason: '', refund_mode: 'Same as payment', account_details: '' });
        setSelectedInvoice(null);
        loadRefunds();
        setError('');

        setTimeout(() => {
            setSuccess('');
            if (onSuccess) onSuccess(newRefund);
        }, 3000);
    };

    const handleApprove = (refundId) => {
        let all = [];
        try {
            const stored = localStorage.getItem('billing_refunds');
            if (stored && stored !== 'undefined') {
            try {
                all = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing invoices:', e);
            }
        }
        } catch(e) { console.error(e); }
        const updated = all.map(r => {
            if (r.id === refundId) {
                return { ...r, status: 'approved', approved_at: new Date().toISOString(), approved_by: localStorage.getItem('userName') || 'Admin' };
            }
            return r;
        });
        localStorage.setItem('billing_refunds', JSON.stringify(updated));
        loadRefunds();
        setSuccess('Refund approved!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleProcess = (refundId) => {
        let all = [];
        try {
            const stored = localStorage.getItem('billing_refunds');
            if (stored && stored !== 'undefined') {
            try {
                all = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing invoices:', e);
            }
        }
        } catch(e) { console.error(e); }
        const updated = all.map(r => {
            if (r.id === refundId) {
                return { ...r, status: 'processed', processed_at: new Date().toISOString() };
            }
            return r;
        });
        localStorage.setItem('billing_refunds', JSON.stringify(updated));
        loadRefunds();
        setSuccess('Refund processed successfully!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleClose = () => {
        setSelectedInvoice(null);
        setSearchTerm('');
        setInvoiceResults([]);
        setError('');
        onHide();
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'pending_approval': return <Badge bg="warning"><Clock size={12} /> Pending Approval</Badge>;
            case 'approved': return <Badge bg="info"><Check size={12} /> Approved</Badge>;
            case 'processed': return <Badge bg="success"><Check size={12} /> Processed</Badge>;
            case 'rejected': return <Badge bg="danger"><X size={12} /> Rejected</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-danger text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <RotateCcw size={20} /> Refund Processing
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {success && <Alert variant="success" className="py-2">{success}</Alert>}
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                
                <div className="d-flex gap-2 mb-4">
                    <Button variant={mode === 'new' ? 'danger' : 'outline-danger'} onClick={() => setMode('new')}>
                        New Refund Request
                    </Button>
                    <Button variant={mode === 'list' ? 'danger' : 'outline-danger'} onClick={() => setMode('list')}>
                        All Refunds ({refunds.length})
                    </Button>
                </div>

                {mode === 'new' ? (
                    <Form>
                        {/* Invoice Selection */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold"><FileText size={16} className="me-1" />Select Invoice *</Form.Label>
                            {selectedInvoice ? (
                                <Alert variant="info" className="py-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Invoice:</strong> {selectedInvoice.invoice_number || `#${selectedInvoice.id}`}
                                            <span className="mx-2">|</span>
                                            <strong>Patient:</strong> {selectedInvoice.patient_name}
                                            <span className="mx-2">|</span>
                                            <strong>Amount:</strong> {formatCurrency(selectedInvoice.total_amount)}
                                            {selectedInvoice.amount_paid && (
                                                <span className="text-success ms-2">(Paid: {formatCurrency(selectedInvoice.amount_paid)})</span>
                                            )}
                                        </div>
                                        <Button variant="outline-danger" size="sm" onClick={handleClearInvoice}>Change</Button>
                                    </div>
                                </Alert>
                            ) : (
                                <div className="position-relative">
                                    <InputGroup>
                                        <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                        <Form.Control 
                                            placeholder="Search by patient name or invoice number..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                        {searching && <InputGroup.Text><Spinner size="sm" /></InputGroup.Text>}
                                    </InputGroup>
                                    {invoiceResults.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1000 }}>
                                            {invoiceResults.map(inv => (
                                                <div 
                                                    key={inv.id} 
                                                    className="p-2 border-bottom"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleSelectInvoice(inv)}
                                                >
                                                    <div className="d-flex justify-content-between">
                                                        <span>
                                                            <strong>{inv.invoice_number || `#${inv.id}`}</strong>
                                                            <span className="text-muted ms-2">- {inv.patient_name}</span>
                                                        </span>
                                                        <span className="text-success">{formatCurrency(inv.total_amount)}</span>
                                                    </div>
                                                    <small className="text-muted">
                                                        {new Date(inv.generated_at).toLocaleDateString()} | 
                                                        <Badge bg={inv.status === 'Paid' ? 'success' : 'warning'} className="ms-1">{inv.status}</Badge>
                                                    </small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Form.Group>
                        
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Refund Amount (₹)*</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text>₹</InputGroup.Text>
                                        <Form.Control 
                                            type="number" 
                                            value={form.amount}
                                            onChange={e => setForm({...form, amount: e.target.value})}
                                            placeholder="1000"
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Refund Mode</Form.Label>
                                    <Form.Select value={form.refund_mode}
                                        onChange={e => setForm({...form, refund_mode: e.target.value})}>
                                        <option>Same as payment</option>
                                        <option>Cash</option>
                                        <option>Bank Transfer (NEFT/RTGS)</option>
                                        <option>Cheque</option>
                                        <option>UPI</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Reason for Refund*</Form.Label>
                            <Form.Select value={form.reason}
                                onChange={e => setForm({...form, reason: e.target.value})}>
                                <option value="">Select reason...</option>
                                <option>Overpayment</option>
                                <option>Service not availed</option>
                                <option>Duplicate payment</option>
                                <option>Patient request - Surgery cancelled</option>
                                <option>Patient request - Treatment discontinued</option>
                                <option>Insurance claim approved</option>
                                <option>Billing error</option>
                                <option>Other</option>
                            </Form.Select>
                        </Form.Group>
                        {form.refund_mode === 'Bank Transfer (NEFT/RTGS)' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Bank Account Details</Form.Label>
                                <Form.Control 
                                    as="textarea" rows={2}
                                    value={form.account_details}
                                    onChange={e => setForm({...form, account_details: e.target.value})}
                                    placeholder="Account Number, IFSC, Bank Name, Account Holder"
                                />
                            </Form.Group>
                        )}
                        <Alert variant="warning" className="py-2">
                            <AlertCircle size={14} className="me-1" /> Refunds require admin approval before processing
                        </Alert>
                    </Form>
                ) : (
                    <Table hover size="sm">
                        <thead className="bg-light">
                            <tr>
                                <th>Refund #</th>
                                <th>Invoice</th>
                                <th>Patient</th>
                                <th>Amount</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {refunds.length === 0 ? (
                                <tr><td colSpan="7" className="text-center text-muted py-3">No refunds recorded</td></tr>
                            ) : refunds.map(r => (
                                <tr key={r.id}>
                                    <td><code>{r.refund_number}</code></td>
                                    <td>{r.invoice_number}</td>
                                    <td><strong>{r.patient_name}</strong></td>
                                    <td className="fw-bold text-danger">{formatCurrency(r.amount)}</td>
                                    <td>{r.reason}</td>
                                    <td>{getStatusBadge(r.status)}</td>
                                    <td>
                                        {r.status === 'pending_approval' && (
                                            <Button size="sm" variant="success" className="me-1" onClick={() => handleApprove(r.id)}>
                                                Approve
                                            </Button>
                                        )}
                                        {r.status === 'approved' && (
                                            <Button size="sm" variant="primary" onClick={() => handleProcess(r.id)}>
                                                Process
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
                {mode === 'new' && (
                    <Button variant="danger" onClick={handleSubmit} disabled={!selectedInvoice || !form.amount || !form.reason}>
                        <RotateCcw size={16} className="me-1" /> Submit Refund Request
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default RefundModal;

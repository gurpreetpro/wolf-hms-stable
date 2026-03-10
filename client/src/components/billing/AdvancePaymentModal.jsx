import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, InputGroup, Alert, Table, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { Wallet, Plus, Check, History, Search, User } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import api from '../../utils/axiosInstance';

/**
 * AdvancePaymentModal - Record advance deposits with patient selection
 */
const AdvancePaymentModal = ({ show, onHide, patientId, patientName, onSuccess }) => {
    const [mode, setMode] = useState('new'); // 'new' | 'history'
    const [success, setSuccess] = useState('');
    const [advances, setAdvances] = useState([]);
    
    // Patient search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    
    const [form, setForm] = useState({
        amount: '',
        payment_mode: 'Cash',
        reference: '',
        purpose: 'IPD Admission',
        notes: ''
    });

    // Initialize with passed patient if any
    useEffect(() => {
        if (show && patientId && patientName) {
            setSelectedPatient({ id: patientId, name: patientName });
        }
    }, [show, patientId, patientName]);

    const loadAdvances = useCallback(() => {
        let all = [];
        try {
            const stored = localStorage.getItem('billing_advances');
            if (stored && stored !== 'undefined') {
                all = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error parsing billing_advances', e);
            localStorage.removeItem('billing_advances');
        }
        const filtered = selectedPatient 
            ? all.filter(a => a.patient_id === selectedPatient.id)
            : all;
        setAdvances(filtered);
    }, [selectedPatient]);

    useEffect(() => {
        if (show) {
            loadAdvances();
        }
    }, [show, loadAdvances]);

    // Search patients
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
    };

    const handleClearPatient = () => {
        setSelectedPatient(null);
    };

    const handleSubmit = () => {
        if (!selectedPatient) {
            alert('Please select a patient first');
            return;
        }
        if (!form.amount || parseFloat(form.amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const newAdvance = {
            id: Date.now(),
            patient_id: selectedPatient.id,
            patient_name: selectedPatient.name,
            amount: parseFloat(form.amount),
            payment_mode: form.payment_mode,
            reference: form.reference,
            purpose: form.purpose,
            notes: form.notes,
            utilized: 0,
            balance: parseFloat(form.amount),
            created_at: new Date().toISOString(),
            receipt_number: `ADV-${Date.now().toString().slice(-8)}`
        };

        let all = [];
        try {
            const stored = localStorage.getItem('billing_advances');
            if (stored && stored !== 'undefined') {
                all = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error parsing billing_advances', e);
            localStorage.removeItem('billing_advances');
        }
        all.push(newAdvance);
        localStorage.setItem('billing_advances', JSON.stringify(all));

        setSuccess(`Advance of ${formatCurrency(form.amount)} recorded for ${selectedPatient.name}! Receipt: ${newAdvance.receipt_number}`);
        setForm({ amount: '', payment_mode: 'Cash', reference: '', purpose: 'IPD Admission', notes: '' });
        loadAdvances();

        setTimeout(() => {
            setSuccess('');
            if (onSuccess) onSuccess(newAdvance);
        }, 3000);
    };

    const handleClose = () => {
        setSelectedPatient(null);
        setSearchTerm('');
        setSearchResults([]);
        onHide();
    };

    const getTotalBalance = () => {
        return advances.reduce((sum, a) => sum + (a.balance || a.amount - (a.utilized || 0)), 0);
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-info text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Wallet size={20} /> Advance Payments / Deposits
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {success && <Alert variant="success" className="py-2">{success}</Alert>}
                
                <div className="d-flex gap-2 mb-4">
                    <Button variant={mode === 'new' ? 'primary' : 'outline-primary'} onClick={() => setMode('new')}>
                        <Plus size={16} className="me-1" /> New Advance
                    </Button>
                    <Button variant={mode === 'history' ? 'primary' : 'outline-primary'} onClick={() => setMode('history')}>
                        <History size={16} className="me-1" /> History ({advances.length})
                    </Button>
                </div>

                {mode === 'new' ? (
                    <Form>
                        {/* Patient Selection */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold"><User size={16} className="me-1" />Patient *</Form.Label>
                            {selectedPatient ? (
                                <Alert variant="success" className="py-2 d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong>{selectedPatient.name}</strong>
                                        {selectedPatient.phone && <span className="ms-2 text-muted">({selectedPatient.phone})</span>}
                                    </span>
                                    <Button variant="outline-danger" size="sm" onClick={handleClearPatient}>Change</Button>
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
                                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
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

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount (₹)*</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text>₹</InputGroup.Text>
                                        <Form.Control 
                                            type="number" 
                                            value={form.amount}
                                            onChange={e => setForm({...form, amount: e.target.value})}
                                            placeholder="10000"
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Mode</Form.Label>
                                    <Form.Select value={form.payment_mode}
                                        onChange={e => setForm({...form, payment_mode: e.target.value})}>
                                        <option>Cash</option>
                                        <option>Credit Card</option>
                                        <option>Debit Card</option>
                                        <option>UPI</option>
                                        <option>Net Banking</option>
                                        <option>Cheque</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Purpose</Form.Label>
                                    <Form.Select value={form.purpose}
                                        onChange={e => setForm({...form, purpose: e.target.value})}>
                                        <option>IPD Admission</option>
                                        <option>Surgery</option>
                                        <option>Procedure</option>
                                        <option>Investigation</option>
                                        <option>General Deposit</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Reference / Transaction ID</Form.Label>
                                    <Form.Control 
                                        value={form.reference}
                                        onChange={e => setForm({...form, reference: e.target.value})}
                                        placeholder="Optional"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm({...form, notes: e.target.value})}
                                placeholder="Optional notes..."
                            />
                        </Form.Group>
                    </Form>
                ) : (
                    <div>
                        <div className="bg-info bg-opacity-10 p-3 rounded mb-3 d-flex justify-content-between">
                            <span>Total Available Balance:</span>
                            <span className="fw-bold text-info fs-5">{formatCurrency(getTotalBalance())}</span>
                        </div>
                        <Table hover size="sm">
                            <thead className="bg-light">
                                <tr>
                                    <th>Receipt</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Purpose</th>
                                    <th className="text-end">Amount</th>
                                    <th className="text-end">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advances.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center text-muted py-3">No advances recorded</td></tr>
                                ) : advances.map(a => (
                                    <tr key={a.id}>
                                        <td><code>{a.receipt_number}</code></td>
                                        <td><strong>{a.patient_name}</strong></td>
                                        <td>{new Date(a.created_at).toLocaleDateString()}</td>
                                        <td><Badge bg="secondary">{a.purpose}</Badge></td>
                                        <td className="text-end">{formatCurrency(a.amount)}</td>
                                        <td className="text-end fw-bold text-success">{formatCurrency(a.balance || a.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
                {mode === 'new' && (
                    <Button variant="info" onClick={handleSubmit} disabled={!selectedPatient || !form.amount}>
                        <Check size={16} className="me-1" /> Record Advance
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default AdvancePaymentModal;

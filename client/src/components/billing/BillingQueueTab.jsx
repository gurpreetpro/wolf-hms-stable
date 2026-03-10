/**
 * BillingQueueTab.jsx - Centralized Billing Queue Component
 * 
 * Gold Standard Implementation:
 * - Displays all pending charges from Lab, Pharmacy, OPD, etc.
 * - Groups charges by patient for easy billing
 * - Allows billing staff to select charges and create invoices
 * - Real-time updates via socket.io
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, Table, Button, Form, Badge, Spinner, Alert, 
    InputGroup, Row, Col, Modal
} from 'react-bootstrap';
import { 
    Search, Filter, Check, X, FileText, IndianRupee, 
    User, Clock, RefreshCw, Trash2, ChevronDown, ChevronRight, Shield, AlertTriangle
} from 'lucide-react';
import api from '../../utils/axiosInstance';
import { formatCurrency } from '../../utils/currency';

const BillingQueueTab = ({ onInvoiceCreated }) => {
    const [loading, setLoading] = useState(true);
    const [charges, setCharges] = useState([]);
    const [grouped, setGrouped] = useState([]);
    const [summary, setSummary] = useState({
        pending_count: 0,
        pending_total: 0,
        today_count: 0,
        today_total: 0,
        by_type: [],
        insurance_eligible_count: 0,
        insurance_eligible_total: 0
    });
    const [selectedCharges, setSelectedCharges] = useState([]);
    const [expandedPatients, setExpandedPatients] = useState({});
    const [filters, setFilters] = useState({
        status: 'pending',
        charge_type: '',
        search: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingCharge, setCancellingCharge] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    // Fetch pending charges
    const fetchCharges = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.charge_type) params.append('charge_type', filters.charge_type);

            const [chargesRes, summaryRes] = await Promise.all([
                api.get(`/api/charges?${params.toString()}`),
                api.get('/api/charges/summary')
            ]);

            const chargesData = chargesRes.data?.data || chargesRes.data;
            setCharges(chargesData?.charges || []);
            setGrouped(chargesData?.grouped || []);
            setSummary(summaryRes.data?.data?.summary || summaryRes.data?.summary || {
                pending_count: 0,
                pending_total: 0,
                today_count: 0,
                today_total: 0,
                by_type: [],
                insurance_eligible_count: 0,
                insurance_eligible_total: 0
            });

            // Auto-expand all patients
            const expanded = {};
            (chargesData?.grouped || []).forEach(g => {
                expanded[g.patient_id] = true;
            });
            setExpandedPatients(expanded);

        } catch (err) {
            console.error('Error fetching charges:', err);
            setErrorMessage('Failed to load pending charges');
        } finally {
            setLoading(false);
        }
    }, [filters.status, filters.charge_type]);

    useEffect(() => {
        fetchCharges();
    }, [fetchCharges]);

    // Toggle patient expansion
    const togglePatient = (patientId) => {
        setExpandedPatients(prev => ({
            ...prev,
            [patientId]: !prev[patientId]
        }));
    };

    // Toggle charge selection
    const toggleChargeSelection = (chargeId) => {
        setSelectedCharges(prev => 
            prev.includes(chargeId) 
                ? prev.filter(id => id !== chargeId)
                : [...prev, chargeId]
        );
    };

    // Select all charges for a patient
    const selectAllForPatient = (patientId, patientCharges) => {
        const chargeIds = patientCharges.map(c => c.id);
        const allSelected = chargeIds.every(id => selectedCharges.includes(id));
        
        if (allSelected) {
            // Deselect all
            setSelectedCharges(prev => prev.filter(id => !chargeIds.includes(id)));
        } else {
            // Select all
            setSelectedCharges(prev => [...new Set([...prev, ...chargeIds])]);
        }
    };

    // Create invoice from selected charges
    const handleCreateInvoice = async () => {
        if (selectedCharges.length === 0) {
            setErrorMessage('Please select at least one charge');
            return;
        }

        // Check all selected charges are for the same patient
        const selectedItems = charges.filter(c => selectedCharges.includes(c.id));
        const patientIds = [...new Set(selectedItems.map(c => c.patient_id))];
        
        if (patientIds.length > 1) {
            setErrorMessage('All selected charges must be for the same patient');
            return;
        }

        try {
            setCreatingInvoice(true);
            const response = await api.post('/api/charges/invoice', {
                charge_ids: selectedCharges,
                create_new_invoice: true
            });

            const result = response.data?.data || response.data;
            
            setSuccessMessage(`✅ Invoice created! ${result.total_amount ? formatCurrency(result.total_amount) : ''}`);
            setSelectedCharges([]);
            fetchCharges();
            
            if (onInvoiceCreated) {
                onInvoiceCreated(result.invoice_id);
            }

            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
            console.error('Error creating invoice:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setCreatingInvoice(false);
        }
    };

    // Cancel a charge
    const handleCancelCharge = async () => {
        if (!cancellingCharge) return;

        try {
            await api.post(`/api/charges/${cancellingCharge.id}/cancel`, {
                reason: cancelReason || 'Cancelled by billing staff'
            });

            setSuccessMessage('Charge cancelled successfully');
            setShowCancelModal(false);
            setCancellingCharge(null);
            setCancelReason('');
            fetchCharges();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error cancelling charge:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to cancel charge');
        }
    };

    // Get charge type badge color
    const getChargeTypeBadge = (type) => {
        const colors = {
            lab: 'info',
            pharmacy: 'success',
            consultation: 'primary',
            procedure: 'warning',
            bed: 'secondary',
            equipment: 'dark',
            other: 'light'
        };
        return colors[type] || 'secondary';
    };

    // Get insurance status badge
    const getInsuranceBadge = (charge) => {
        if (!charge.insurance_eligible) return null;
        
        const status = charge.preauth_status || 'pending';
        const statusConfig = {
            'not_required': { bg: 'secondary', text: 'N/A', icon: null },
            'pending': { bg: 'warning', text: 'Preauth Pending', icon: <Clock size={12} /> },
            'approved': { bg: 'success', text: 'Preauth Approved', icon: <Check size={12} /> },
            'rejected': { bg: 'danger', text: 'Preauth Rejected', icon: <X size={12} /> }
        };
        
        const config = statusConfig[status] || statusConfig['pending'];
        
        return (
            <Badge bg={config.bg} className="d-flex align-items-center gap-1" style={{fontSize: '0.7rem'}}>
                <Shield size={10} />
                {config.icon}
                {config.text}
            </Badge>
        );
    };

    // Calculate selected total
    const selectedTotal = charges
        .filter(c => selectedCharges.includes(c.id))
        .reduce((sum, c) => sum + parseFloat(c.total_price || 0), 0);

    // Filter grouped data by search
    const filteredGrouped = grouped.filter(g => 
        !filters.search || 
        g.patient_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        g.uhid?.toLowerCase().includes(filters.search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <Spinner animation="border" variant="primary" />
                <span className="ms-3">Loading billing queue...</span>
            </div>
        );
    }

    return (
        <div className="billing-queue-tab">
            {/* Success/Error Messages */}
            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            )}
            {errorMessage && (
                <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>
                    {errorMessage}
                </Alert>
            )}

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <Card.Body className="text-white py-3">
                            <small className="opacity-75">Pending Charges</small>
                            <h4 className="fw-bold mb-0">{summary.pending_count || 0}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                        <Card.Body className="text-white py-3">
                            <small className="opacity-75">Pending Amount</small>
                            <h4 className="fw-bold mb-0">{formatCurrency(summary.pending_total || 0)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Card.Body className="text-white py-3">
                            <small className="opacity-75">Today's Charges</small>
                            <h4 className="fw-bold mb-0">{summary.today_count || 0}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        <Card.Body className="text-white py-3">
                            <small className="opacity-75">Today's Amount</small>
                            <h4 className="fw-bold mb-0">{formatCurrency(summary.today_total || 0)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                {/* Insurance Eligible Card */}
                <Col xs={12} md={6} lg={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                        <Card.Body className="text-white py-3">
                            <div className="d-flex align-items-center gap-2">
                                <Shield size={18} />
                                <small className="opacity-75">Insurance Eligible</small>
                            </div>
                            <h4 className="fw-bold mb-0">{summary.insurance_eligible_count || 0} charges</h4>
                            <small className="opacity-75">{formatCurrency(summary.insurance_eligible_total || 0)}</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Type Breakdown */}
            {summary.by_type && summary.by_type.length > 0 && (
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="py-3">
                        <div className="d-flex flex-wrap gap-3">
                            {summary.by_type.map(t => (
                                <div key={t.type} className="d-flex align-items-center gap-2">
                                    <Badge bg={getChargeTypeBadge(t.type)} className="text-uppercase">
                                        {t.type}
                                    </Badge>
                                    <span className="text-muted small">{t.count} charges • {formatCurrency(t.total)}</span>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Filters & Actions */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="py-3">
                    <Row className="g-3 align-items-center">
                        <Col md={4}>
                            <InputGroup>
                                <InputGroup.Text className="bg-light">
                                    <Search size={16} />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search patient name or UHID..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="pending">Pending</option>
                                <option value="all">All Status</option>
                                <option value="invoiced">Invoiced</option>
                                <option value="cancelled">Cancelled</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                value={filters.charge_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, charge_type: e.target.value }))}
                            >
                                <option value="">All Departments</option>
                                <option value="lab">Lab</option>
                                <option value="pharmacy">Pharmacy</option>
                                <option value="consultation">Consultation</option>
                                <option value="procedure">Procedure</option>
                                <option value="bed">Bed Charges</option>
                            </Form.Select>
                        </Col>
                        <Col md={4} className="text-end">
                            <Button variant="outline-secondary" className="me-2" onClick={fetchCharges}>
                                <RefreshCw size={16} className="me-1" /> Refresh
                            </Button>
                            <Button 
                                variant="success" 
                                disabled={selectedCharges.length === 0 || creatingInvoice}
                                onClick={handleCreateInvoice}
                            >
                                {creatingInvoice ? (
                                    <Spinner size="sm" className="me-1" />
                                ) : (
                                    <FileText size={16} className="me-1" />
                                )}
                                Create Invoice ({selectedCharges.length})
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Selected Total */}
            {selectedCharges.length > 0 && (
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                    <span>
                        <strong>{selectedCharges.length}</strong> charges selected
                    </span>
                    <span className="fw-bold fs-5">
                        Total: {formatCurrency(selectedTotal)}
                    </span>
                </Alert>
            )}

            {/* Charges List - Grouped by Patient */}
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    {filteredGrouped.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <IndianRupee size={48} className="opacity-25 mb-3" />
                            <p className="mb-0">No pending charges found</p>
                            <small>Charges from Lab, Pharmacy, and other departments will appear here</small>
                        </div>
                    ) : (
                        filteredGrouped.map(patientGroup => {
                            const isExpanded = expandedPatients[patientGroup.patient_id];
                            const patientCharges = patientGroup.charges || [];
                            const allSelected = patientCharges.length > 0 && 
                                patientCharges.every(c => selectedCharges.includes(c.id));
                            
                            return (
                                <div key={patientGroup.patient_id} className="border-bottom">
                                    {/* Patient Header */}
                                    <div 
                                        className="d-flex align-items-center justify-content-between p-3 bg-light"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => togglePatient(patientGroup.patient_id)}
                                    >
                                        <div className="d-flex align-items-center gap-3">
                                            <Form.Check
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    selectAllForPatient(patientGroup.patient_id, patientCharges);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            <User size={18} className="text-primary" />
                                            <div>
                                                <strong>{patientGroup.patient_name}</strong>
                                                {patientGroup.uhid && (
                                                    <Badge bg="secondary" className="ms-2">{patientGroup.uhid}</Badge>
                                                )}
                                                {patientGroup.ward && (
                                                    <small className="text-muted ms-2">
                                                        Ward: {patientGroup.ward} | Bed: {patientGroup.bed_number}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <Badge bg="warning" text="dark" className="me-2">
                                                {patientCharges.length} charges
                                            </Badge>
                                            <span className="fw-bold text-success fs-5">
                                                {formatCurrency(patientGroup.total_amount || 0)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Charges Table */}
                                    {isExpanded && (
                                        <Table hover className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th width="40"></th>
                                                    <th>Description</th>
                                                    <th>Type</th>
                                                    <th>Insurance</th>
                                                    <th>Qty</th>
                                                    <th>Amount</th>
                                                    <th>Patient Share</th>
                                                    <th>Created</th>
                                                    <th width="80">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {patientCharges.map(charge => (
                                                    <tr key={charge.id}>
                                                        <td>
                                                            <Form.Check
                                                                type="checkbox"
                                                                checked={selectedCharges.includes(charge.id)}
                                                                onChange={() => toggleChargeSelection(charge.id)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <div>{charge.description}</div>
                                                            {charge.source_table && (
                                                                <small className="text-muted">
                                                                    Ref: {charge.source_table} #{charge.source_id}
                                                                </small>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Badge bg={getChargeTypeBadge(charge.charge_type)}>
                                                                {charge.charge_type}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            {charge.insurance_eligible ? (
                                                                <div>
                                                                    {getInsuranceBadge(charge)}
                                                                    {charge.insurance_share > 0 && (
                                                                        <div className="small text-muted mt-1">
                                                                            TPA: {formatCurrency(charge.insurance_share)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted small">Self</span>
                                                            )}
                                                        </td>
                                                        <td>{charge.quantity}</td>
                                                        <td>
                                                            <div className="fw-bold">{formatCurrency(charge.total_price)}</div>
                                                            {charge.insurance_eligible && charge.patient_share !== null && (
                                                                <small className="text-muted">
                                                                    (Unit: {formatCurrency(charge.unit_price)})
                                                                </small>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {charge.insurance_eligible && charge.patient_share !== null ? (
                                                                <span className="fw-bold text-success">
                                                                    {formatCurrency(charge.patient_share)}
                                                                </span>
                                                            ) : (
                                                                <span className="fw-bold">
                                                                    {formatCurrency(charge.total_price)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <small className="text-muted">
                                                                {new Date(charge.created_at).toLocaleString('en-IN', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </small>
                                                            {charge.created_by_user?.name && (
                                                                <div className="small text-muted">
                                                                    by {charge.created_by_user.name}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setCancellingCharge(charge);
                                                                    setShowCancelModal(true);
                                                                }}
                                                                title="Cancel Charge"
                                                            >
                                                                <X size={14} />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </div>
                            );
                        })
                    )}
                </Card.Body>
            </Card>

            {/* Cancel Charge Modal */}
            <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title><X size={20} className="me-2" /> Cancel Charge</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cancellingCharge && (
                        <>
                            <div className="bg-light p-3 rounded mb-3">
                                <div><strong>{cancellingCharge.description}</strong></div>
                                <div className="text-muted">Amount: {formatCurrency(cancellingCharge.total_price)}</div>
                            </div>
                            <Form.Group>
                                <Form.Label>Reason for Cancellation</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Enter reason for cancelling this charge..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                        Close
                    </Button>
                    <Button variant="danger" onClick={handleCancelCharge}>
                        <Trash2 size={16} className="me-1" /> Cancel Charge
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default BillingQueueTab;

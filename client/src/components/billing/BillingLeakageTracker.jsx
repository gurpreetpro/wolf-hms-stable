import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Row, Col, Form, Modal } from 'react-bootstrap';
import { AlertTriangle, DollarSign, Package, FileText, Activity, CheckCircle, RefreshCw, Search, Eye } from 'lucide-react';
import api from '../../utils/axiosInstance';
import { formatCurrency } from '../../utils/currency';

/**
 * BillingLeakageTracker - Zero leakage billing component
 * Tracks all services/items that have been provided but not yet billed
 * Ensures no revenue is lost by identifying:
 * 1. IPD services not added to discharge bill
 * 2. Lab tests completed but not billed
 * 3. Pharmacy items dispensed but not charged
 * 4. Procedures performed without billing
 */
const BillingLeakageTracker = () => {
    const [leakages, setLeakages] = useState({
        unbilledLabs: [],
        unbilledMeds: [],
        unbilledServices: [],
        summary: { total: 0, labAmount: 0, medAmount: 0, serviceAmount: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, labs, meds, services
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Fetch unbilled items
    const fetchLeakages = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Fetch unbilled labs - completed lab tests not yet billed
            const labsRes = await api.get('/api/lab/completed', {
                headers: { Authorization: `Bearer ${token}` },
                params: { billed: false }
            }).catch(() => ({ data: [] }));
            
            // Fetch unbilled pharmacy items - dispensed but not billed
            const medsRes = await api.get('/api/pharmacy/dispenses/unbilled', {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] }));
            
            // Fetch unbilled services - care tasks completed but not billed
            const servicesRes = await api.get('/api/clinical/tasks', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'Completed', billed: false }
            }).catch(() => ({ data: [] }));
            
            const labs = Array.isArray(labsRes.data) ? labsRes.data : (labsRes.data?.data || []);
            const meds = Array.isArray(medsRes.data) ? medsRes.data : (medsRes.data?.data || []);
            const services = Array.isArray(servicesRes.data) ? servicesRes.data : (servicesRes.data?.data || []);
            
            // Filter for unbilled items only
            const unbilledLabs = labs.filter(l => !l.billed && l.status === 'Completed');
            const unbilledMeds = meds.filter(m => !m.billed);
            const unbilledServices = services.filter(s => !s.billed && s.status === 'Completed');
            
            // Calculate totals
            const labAmount = unbilledLabs.reduce((sum, l) => sum + (l.price || 0), 0);
            const medAmount = unbilledMeds.reduce((sum, m) => sum + (m.amount || m.price || 0), 0);
            const serviceAmount = unbilledServices.reduce((sum, s) => sum + (s.charge || 0), 0);
            
            setLeakages({
                unbilledLabs,
                unbilledMeds,
                unbilledServices,
                summary: {
                    total: labAmount + medAmount + serviceAmount,
                    labAmount,
                    medAmount,
                    serviceAmount
                }
            });
        } catch (err) {
            console.error('Failed to fetch leakage data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeakages();
        // Refresh every minute
        const interval = setInterval(fetchLeakages, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleAddToBill = async (item, type) => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/billing/add-item', {
                item_id: item.id,
                item_type: type,
                patient_id: item.patient_id,
                admission_id: item.admission_id,
                amount: item.price || item.amount || item.charge
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLeakages(); // Refresh
            alert('Added to patient bill!');
        } catch (err) {
            console.error('Failed to add to bill:', err);
            alert('Failed to add to bill. Please try again.');
        }
    };

    const viewPatientDetails = (item) => {
        setSelectedPatient(item);
        setShowDetailModal(true);
    };

    // Combine all items for display
    const getAllItems = () => {
        const items = [];
        leakages.unbilledLabs.forEach(l => items.push({ ...l, type: 'Lab', icon: <Activity size={14} />, bgColor: 'info' }));
        leakages.unbilledMeds.forEach(m => items.push({ ...m, type: 'Pharmacy', icon: <Package size={14} />, bgColor: 'primary' }));
        leakages.unbilledServices.forEach(s => items.push({ ...s, type: 'Service', icon: <FileText size={14} />, bgColor: 'success' }));
        return items;
    };

    const getFilteredItems = () => {
        if (filter === 'labs') return leakages.unbilledLabs.map(l => ({ ...l, type: 'Lab', icon: <Activity size={14} />, bgColor: 'info' }));
        if (filter === 'meds') return leakages.unbilledMeds.map(m => ({ ...m, type: 'Pharmacy', icon: <Package size={14} />, bgColor: 'primary' }));
        if (filter === 'services') return leakages.unbilledServices.map(s => ({ ...s, type: 'Service', icon: <FileText size={14} />, bgColor: 'success' }));
        return getAllItems();
    };

    const totalItems = leakages.unbilledLabs.length + leakages.unbilledMeds.length + leakages.unbilledServices.length;

    if (loading) {
        return (
            <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-muted mt-2 mb-0">Scanning for unbilled items...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <div>
            {/* Summary Cards */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className={`border-0 shadow-sm ${leakages.summary.total > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                        <Card.Body className="text-center">
                            <DollarSign size={24} className="mb-2" />
                            <h4 className="mb-0">{formatCurrency(leakages.summary.total)}</h4>
                            <small>{leakages.summary.total > 0 ? 'Potential Revenue Leakage' : 'No Leakage Detected'}</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-info text-white" onClick={() => setFilter('labs')} style={{ cursor: 'pointer' }}>
                        <Card.Body className="text-center">
                            <Activity size={24} className="mb-2" />
                            <h4 className="mb-0">{leakages.unbilledLabs.length}</h4>
                            <small>Unbilled Lab Tests</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-primary text-white" onClick={() => setFilter('meds')} style={{ cursor: 'pointer' }}>
                        <Card.Body className="text-center">
                            <Package size={24} className="mb-2" />
                            <h4 className="mb-0">{leakages.unbilledMeds.length}</h4>
                            <small>Unbilled Medications</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-success text-white" onClick={() => setFilter('services')} style={{ cursor: 'pointer' }}>
                        <Card.Body className="text-center">
                            <FileText size={24} className="mb-2" />
                            <h4 className="mb-0">{leakages.unbilledServices.length}</h4>
                            <small>Unbilled Services</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Leakage Alert */}
            {leakages.summary.total > 0 && (
                <Alert variant="danger" className="d-flex align-items-center justify-content-between">
                    <div>
                        <AlertTriangle size={18} className="me-2" />
                        <strong>Revenue Leakage Alert!</strong> {totalItems} items worth {formatCurrency(leakages.summary.total)} are pending billing.
                    </div>
                    <Button variant="danger" size="sm" onClick={fetchLeakages}>
                        <RefreshCw size={14} className="me-1" /> Refresh
                    </Button>
                </Alert>
            )}

            {/* Filter Tabs */}
            <div className="d-flex gap-2 mb-3">
                <Button variant={filter === 'all' ? 'dark' : 'outline-dark'} size="sm" onClick={() => setFilter('all')}>
                    All ({totalItems})
                </Button>
                <Button variant={filter === 'labs' ? 'info' : 'outline-info'} size="sm" onClick={() => setFilter('labs')}>
                    Labs ({leakages.unbilledLabs.length})
                </Button>
                <Button variant={filter === 'meds' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setFilter('meds')}>
                    Pharmacy ({leakages.unbilledMeds.length})
                </Button>
                <Button variant={filter === 'services' ? 'success' : 'outline-success'} size="sm" onClick={() => setFilter('services')}>
                    Services ({leakages.unbilledServices.length})
                </Button>
            </div>

            {/* Items Table */}
            <Card className="shadow-sm border-0">
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Type</th>
                            <th>Patient</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getFilteredItems().length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-4">
                                    <CheckCircle size={32} className="text-success mb-2" />
                                    <p className="mb-0 text-muted">No unbilled items found. Zero leakage!</p>
                                </td>
                            </tr>
                        ) : (
                            getFilteredItems().map((item, idx) => (
                                <tr key={`${item.type}-${item.id || idx}`}>
                                    <td>
                                        <Badge bg={item.bgColor}>
                                            {item.icon} {item.type}
                                        </Badge>
                                    </td>
                                    <td><strong>{item.patient_name}</strong></td>
                                    <td>{item.test_name || item.drug_name || item.description || '-'}</td>
                                    <td>
                                        <small className="text-muted">
                                            {new Date(item.created_at || item.completed_at).toLocaleDateString()}
                                        </small>
                                    </td>
                                    <td className="fw-bold">{formatCurrency(item.price || item.amount || item.charge || 0)}</td>
                                    <td className="d-flex gap-1">
                                        <Button variant="outline-info" size="sm" onClick={() => viewPatientDetails(item)}>
                                            <Eye size={14} />
                                        </Button>
                                        <Button variant="success" size="sm" onClick={() => handleAddToBill(item, item.type)}>
                                            <DollarSign size={14} /> Bill
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Patient Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Item Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPatient && (
                        <div>
                            <p><strong>Patient:</strong> {selectedPatient.patient_name}</p>
                            <p><strong>Type:</strong> {selectedPatient.type}</p>
                            <p><strong>Description:</strong> {selectedPatient.test_name || selectedPatient.drug_name || selectedPatient.description}</p>
                            <p><strong>Amount:</strong> {formatCurrency(selectedPatient.price || selectedPatient.amount || selectedPatient.charge || 0)}</p>
                            <p><strong>Date:</strong> {new Date(selectedPatient.created_at || selectedPatient.completed_at).toLocaleString()}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                    <Button variant="success" onClick={() => { handleAddToBill(selectedPatient, selectedPatient.type); setShowDetailModal(false); }}>
                        <DollarSign size={14} className="me-1" /> Add to Bill
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default BillingLeakageTracker;

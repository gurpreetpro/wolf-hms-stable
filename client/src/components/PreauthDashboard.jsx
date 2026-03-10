import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Badge, Modal, Form, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import {
    Shield, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
    FileText, User, Calendar, IndianRupee, Search, RefreshCw
} from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

/**
 * Pre-Authorization Dashboard Component
 * Manages insurance pre-auth requests and eligibility verification
 */
const PreauthDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadData();
    }, [filterStatus]);

    const loadData = async () => {
        try {
            const [requestsRes, statsRes] = await Promise.all([
                api.get(`/api/preauth/requests${filterStatus ? `?status=${filterStatus}` : ''}`),
                api.get('/api/preauth/stats')
            ]);
            setRequests(requestsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error loading preauth data:', error);
            // Mock data for demo
            setStats({
                counts: { total: 12, pending: 4, under_review: 3, approved: 4, denied: 1 },
                amounts: { total_requested: 850000, total_approved: 620000, approval_rate: 83 },
                avg_turnaround: 2
            });
            setRequests([
                { id: 1, request_number: 'PA2412-ABC123', patient_name: 'Ramesh Kumar', procedure_name: 'Knee Replacement', requested_amount: 150000, status: 'Approved', approved_amount: 140000, provider_name: 'Star Health', created_at: new Date().toISOString() },
                { id: 2, request_number: 'PA2412-DEF456', patient_name: 'Priya Singh', procedure_name: 'Cardiac Stent', requested_amount: 250000, status: 'Under Review', provider_name: 'ICICI Lombard', created_at: new Date().toISOString() },
                { id: 3, request_number: 'PA2412-GHI789', patient_name: 'Suresh Reddy', procedure_name: 'Appendectomy', requested_amount: 45000, status: 'Pending', provider_name: 'Medi Assist', created_at: new Date().toISOString() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            'Pending': { bg: 'warning', icon: <Clock size={12} /> },
            'Under Review': { bg: 'info', icon: <Search size={12} /> },
            'Approved': { bg: 'success', icon: <CheckCircle size={12} /> },
            'Partially Approved': { bg: 'primary', icon: <CheckCircle size={12} /> },
            'Denied': { bg: 'danger', icon: <XCircle size={12} /> },
            'Expired': { bg: 'secondary', icon: <AlertTriangle size={12} /> }
        };
        const { bg, icon } = config[status] || { bg: 'secondary', icon: null };
        return <Badge bg={bg}>{icon} {status}</Badge>;
    };

    const handleUpdateStatus = async (newStatus, data) => {
        try {
            await api.put(`/api/preauth/request/${selectedRequest.id}/status`, {
                status: newStatus,
                ...data
            });
            setMessage({ type: 'success', text: `Pre-auth ${newStatus.toLowerCase()} successfully` });
            setShowStatusModal(false);
            loadData();
        } catch (error) {
            setMessage({ type: 'danger', text: 'Failed to update status' });
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div>
            {message.text && (
                <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            {/* Stats Row */}
            <Row className="g-3 mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <small className="opacity-75">Total Requests</small>
                                    <h3 className="fw-bold mb-0">{stats?.counts?.total || 0}</h3>
                                </div>
                                <Shield size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <small className="opacity-75">Pending / Review</small>
                                    <h3 className="fw-bold mb-0">{(stats?.counts?.pending || 0) + (stats?.counts?.under_review || 0)}</h3>
                                </div>
                                <Clock size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <small className="opacity-75">Approval Rate</small>
                                    <h3 className="fw-bold mb-0">{stats?.amounts?.approval_rate || 0}%</h3>
                                </div>
                                <CheckCircle size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <small className="opacity-75">Avg Turnaround</small>
                                    <h3 className="fw-bold mb-0">{stats?.avg_turnaround || 2} days</h3>
                                </div>
                                <Calendar size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Amount Summary */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={4}>
                            <small className="text-muted">Total Requested (30 days)</small>
                            <h4 className="fw-bold text-primary mb-0">{formatCurrency(stats?.amounts?.total_requested || 0)}</h4>
                        </Col>
                        <Col md={4}>
                            <small className="text-muted">Total Approved</small>
                            <h4 className="fw-bold text-success mb-0">{formatCurrency(stats?.amounts?.total_approved || 0)}</h4>
                        </Col>
                        <Col md={4}>
                            <small className="text-muted">Approval Progress</small>
                            <ProgressBar
                                now={stats?.amounts?.approval_rate || 0}
                                variant="success"
                                label={`${stats?.amounts?.approval_rate || 0}%`}
                                style={{ height: '24px' }}
                            />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Requests Table */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                        <FileText size={18} className="me-2 text-primary" />
                        Pre-Authorization Requests
                    </h5>
                    <div className="d-flex gap-2">
                        <Form.Select
                            size="sm"
                            style={{ width: '150px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option>Pending</option>
                            <option>Under Review</option>
                            <option>Approved</option>
                            <option>Denied</option>
                        </Form.Select>
                        <Button variant="outline-primary" size="sm" onClick={loadData}>
                            <RefreshCw size={14} />
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                            <Plus size={14} className="me-1" /> New Request
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Request #</th>
                                <th>Patient</th>
                                <th>Procedure</th>
                                <th>Provider</th>
                                <th>Requested</th>
                                <th>Approved</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        No pre-authorization requests found
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id}>
                                        <td><strong>{req.request_number}</strong></td>
                                        <td>
                                            <User size={14} className="me-1 text-muted" />
                                            {req.patient_name}
                                        </td>
                                        <td>{req.procedure_name}</td>
                                        <td><Badge bg="secondary">{req.provider_name}</Badge></td>
                                        <td>{formatCurrency(req.requested_amount)}</td>
                                        <td className={req.approved_amount ? 'text-success fw-bold' : 'text-muted'}>
                                            {req.approved_amount ? formatCurrency(req.approved_amount) : '-'}
                                        </td>
                                        <td>{getStatusBadge(req.status)}</td>
                                        <td>
                                            {(req.status === 'Pending' || req.status === 'Under Review') && (
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setShowStatusModal(true);
                                                    }}
                                                >
                                                    Update
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Status Update Modal */}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><Shield size={20} className="me-2" />Update Pre-Auth Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRequest && (
                        <div>
                            <div className="bg-light p-3 rounded mb-3">
                                <Row>
                                    <Col>
                                        <small className="text-muted">Request</small>
                                        <div className="fw-bold">{selectedRequest.request_number}</div>
                                    </Col>
                                    <Col>
                                        <small className="text-muted">Amount</small>
                                        <div className="fw-bold">{formatCurrency(selectedRequest.requested_amount)}</div>
                                    </Col>
                                </Row>
                            </div>
                            <div className="d-grid gap-2">
                                <Button
                                    variant="success"
                                    onClick={() => handleUpdateStatus('Approved', { approved_amount: selectedRequest.requested_amount })}
                                >
                                    <CheckCircle size={16} className="me-2" />
                                    Approve Full Amount
                                </Button>
                                <Button
                                    variant="warning"
                                    onClick={() => handleUpdateStatus('Partially Approved', { approved_amount: selectedRequest.requested_amount * 0.8 })}
                                >
                                    <CheckCircle size={16} className="me-2" />
                                    Approve 80% (Partial)
                                </Button>
                                <Button
                                    variant="info"
                                    onClick={() => handleUpdateStatus('Under Review', {})}
                                >
                                    <Search size={16} className="me-2" />
                                    Mark Under Review
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleUpdateStatus('Denied', { denial_reason: 'Documentation insufficient' })}
                                >
                                    <XCircle size={16} className="me-2" />
                                    Deny Request
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Create Request Modal (Simplified) */}
            <CreatePreauthModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    loadData();
                    setMessage({ type: 'success', text: 'Pre-auth request created successfully' });
                }}
            />
        </div>
    );
};

/**
 * Create Pre-Auth Request Modal
 */
const CreatePreauthModal = ({ show, onHide, onSuccess }) => {
    const [form, setForm] = useState({
        patient_id: '',
        procedure_type: 'Surgery',
        procedure_name: '',
        estimated_cost: '',
        requested_amount: '',
        expected_admission: '',
        priority: 'Normal'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/api/preauth/request', form);
            onSuccess();
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title><Plus size={20} className="me-2" />New Pre-Authorization Request</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Patient ID *</Form.Label>
                                <Form.Control
                                    type="number"
                                    required
                                    value={form.patient_id}
                                    onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                                    placeholder="Enter patient ID"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Procedure Type *</Form.Label>
                                <Form.Select
                                    value={form.procedure_type}
                                    onChange={(e) => setForm({ ...form, procedure_type: e.target.value })}
                                >
                                    <option>Surgery</option>
                                    <option>Investigation</option>
                                    <option>Treatment</option>
                                    <option>Admission</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Procedure Name *</Form.Label>
                        <Form.Control
                            required
                            value={form.procedure_name}
                            onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
                            placeholder="e.g., Total Knee Replacement"
                        />
                    </Form.Group>
                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Estimated Cost *</Form.Label>
                                <Form.Control
                                    type="number"
                                    required
                                    value={form.estimated_cost}
                                    onChange={(e) => setForm({ ...form, estimated_cost: e.target.value, requested_amount: e.target.value })}
                                    placeholder="₹"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Requested Amount *</Form.Label>
                                <Form.Control
                                    type="number"
                                    required
                                    value={form.requested_amount}
                                    onChange={(e) => setForm({ ...form, requested_amount: e.target.value })}
                                    placeholder="₹"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Priority</Form.Label>
                                <Form.Select
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                >
                                    <option>Normal</option>
                                    <option>Urgent</option>
                                    <option>Emergency</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Expected Admission Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={form.expected_admission}
                            onChange={(e) => setForm({ ...form, expected_admission: e.target.value })}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : <><Plus size={16} className="me-1" /> Create Request</>}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default PreauthDashboard;

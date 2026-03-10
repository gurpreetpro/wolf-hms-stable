import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { Zap, Check, X, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

const EquipmentApprovals = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [denyReason, setDenyReason] = useState('');
    const [processing, setProcessing] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/equipment/requests/pending');
            // Handle wrapped response safely
            // Use optional chaining for safety
            const requestsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setRequests(requestsData);
        } catch (err) {
            console.error('Fetch error:', err);
            // Show more detailed error if available
            setError(err.response?.data?.message || 'Failed to load pending requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (id) => {
        setProcessing(id);
        try {
            await api.post(`/api/equipment/requests/${id}/approve`);
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to approve');
        } finally {
            setProcessing(null);
        }
    };

    const openDenyModal = (request) => {
        setSelectedRequest(request);
        setDenyReason('');
        setShowDenyModal(true);
    };

    const handleDeny = async () => {
        if (!denyReason.trim()) {
            alert('Please provide a reason for denial');
            return;
        }
        setProcessing(selectedRequest.id);
        try {
            await api.post(`/api/equipment/requests/${selectedRequest.id}/deny`, {
                denial_reason: denyReason
            });
            setShowDenyModal(false);
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to deny');
        } finally {
            setProcessing(null);
        }
    };

    const getActionBadge = (action) => {
        switch (action) {
            case 'add': return <Badge bg="success">Add</Badge>;
            case 'edit': return <Badge bg="warning" className="text-dark">Edit</Badge>;
            case 'delete': return <Badge bg="danger">Delete</Badge>;
            default: return <Badge bg="secondary">{action}</Badge>;
        }
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Button variant="link" className="p-0 mb-2" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={18} className="me-1" /> Back to Dashboard
                    </Button>
                    <h3 className="fw-bold mb-0">
                        <Zap size={28} className="me-2 text-warning" />
                        Equipment Approval Requests
                    </h3>
                    <p className="text-muted mb-0">Review and approve equipment changes from ward staff</p>
                </div>
                <Button variant="outline-primary" onClick={fetchRequests}>
                    <RefreshCw size={16} className="me-1" /> Refresh
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {requests.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5">
                        <Zap size={48} className="text-muted mb-3" />
                        <h5 className="text-muted">No Pending Requests</h5>
                        <p className="text-muted mb-0">All equipment change requests have been processed.</p>
                    </Card.Body>
                </Card>
            ) : (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Action</th>
                                    <th>Equipment Name</th>
                                    <th>Category</th>
                                    <th>24-Hour Rate</th>
                                    <th>Requested By</th>
                                    <th>Requested At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td>{getActionBadge(req.action)}</td>
                                        <td className="fw-bold">{req.name}</td>
                                        <td><Badge bg="info" className="text-dark bg-opacity-25">{req.category}</Badge></td>
                                        <td className="fw-bold text-success">{formatCurrency(req.rate_per_24hr)}/day</td>
                                        <td>{req.requested_by_name || 'Unknown'}</td>
                                        <td className="text-muted small">
                                            {new Date(req.requested_at).toLocaleString()}
                                        </td>
                                        <td>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-1"
                                                onClick={() => handleApprove(req.id)}
                                                disabled={processing === req.id}
                                            >
                                                <Check size={14} /> Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => openDenyModal(req)}
                                                disabled={processing === req.id}
                                            >
                                                <X size={14} /> Deny
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Deny Modal */}
            <Modal show={showDenyModal} onHide={() => setShowDenyModal(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>Deny Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>You are about to deny the request to <strong>{selectedRequest?.action}</strong> equipment: <strong>{selectedRequest?.name}</strong></p>
                    <Form.Group>
                        <Form.Label>Reason for Denial *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={denyReason}
                            onChange={e => setDenyReason(e.target.value)}
                            placeholder="Please explain why this request is being denied..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDenyModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeny} disabled={processing}>
                        <X size={16} className="me-1" /> Confirm Denial
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default EquipmentApprovals;

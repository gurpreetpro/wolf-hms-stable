import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { IndianRupee, Check, X, Clock, ArrowRight, Beaker, Building2, Zap } from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';


const PriceApprovals = () => {
    const [key, setKey] = useState('pharmacy');
    const [requests, setRequests] = useState([]);
    const [labRequests, setLabRequests] = useState([]);
    const [wardRequests, setWardRequests] = useState([]);
    const [equipmentRequests, setEquipmentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchRequests();
        fetchLabRequests();
        fetchWardRequests();
        fetchEquipmentRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/api/pharmacy/price-requests');
            setRequests(Array.isArray(res.data) ? res.data : (res.data?.data || []));
            setLoading(false);
        } catch (err) {
            console.error(err);
            setRequests([]);
            setLoading(false);
        }
    };

    const fetchLabRequests = async () => {
        try {
            const res = await api.get('/api/lab/requests');
            setLabRequests(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Lab requests error:', err);
            setLabRequests([]);
        }
    };

    const fetchWardRequests = async () => {
        try {
            const res = await api.get('/api/ward/requests');
            setWardRequests(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Ward requests error:', err);
            setWardRequests([]);
        }
    };

    const fetchEquipmentRequests = async () => {
        try {
            const res = await api.get('/api/equipment/requests/pending');
            setEquipmentRequests(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Equipment requests error:', err);
            setEquipmentRequests([]);
        }
    };

    const handleAction = async (id, action) => {
        setProcessingId(id);
        setMessage(null);
        try {
            await api.post(`/api/pharmacy/price-request/${id}/${action}`);
            setMessage({ type: 'success', text: `Request ${action}d successfully` });
            fetchRequests();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'danger', text: `Failed to ${action} request` });
        } finally {
            setProcessingId(null);
        }
    };

    const handleLabAction = async (id, action) => {
        setProcessingId(id);
        setMessage(null);
        try {
            await api.post(`/api/lab/request/${id}/${action}`);
            setMessage({ type: 'success', text: `Lab Request ${action}d successfully` });
            fetchLabRequests();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'danger', text: `Failed to ${action} lab request` });
        } finally {
            setProcessingId(null);
        }
    };

    const handleWardAction = async (id, action) => {
        setProcessingId(id);
        setMessage(null);
        try {
            await api.post(`/api/ward/request/${id}/${action}`);
            setMessage({ type: 'success', text: `Ward Request ${action}d successfully` });
            fetchWardRequests();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'danger', text: `Failed to ${action} ward request` });
        } finally {
            setProcessingId(null);
        }
    };

    const handleEquipmentAction = async (id, action) => {
        setProcessingId(id);
        setMessage(null);
        try {
            await api.post(`/api/equipment/requests/${id}/${action}`);
            setMessage({ type: 'success', text: `Equipment request ${action}d successfully` });
            fetchEquipmentRequests();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'danger', text: `Failed to ${action} equipment request` });
        } finally {
            setProcessingId(null);
        }
    };

    const getEquipmentActionBadge = (action) => {
        switch (action) {
            case 'add': return <Badge bg="success">New</Badge>;
            case 'edit': return <Badge bg="info">Edit</Badge>;
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
            <h3 className="fw-bold mb-4">Approvals Management</h3>

            {message && (
                <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="mb-4">
                    {message.text}
                </Alert>
            )}

            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-4">
                <Tab eventKey="pharmacy" title="💊 Pharmacy Prices">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 fw-bold">Pending Pharmacy Requests</h5>
                                <Badge bg="warning" text="dark">{requests.length} Pending</Badge>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Item Name</th>
                                    <th>Current Price</th>
                                    <th>New Price</th>
                                    <th>Requested By</th>
                                    <th>Date</th>
                                    <th>Reason</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td className="fw-medium">{req.item_name}</td>
                                        <td className="text-muted">{formatCurrency(req.old_price)}</td>
                                        <td className="fw-bold text-primary">
                                            {formatCurrency(req.new_price)}
                                            {req.new_price > req.old_price ?
                                                <Badge bg="success" className="ms-2">Up</Badge> :
                                                <Badge bg="info" className="ms-2">Down</Badge>
                                            }
                                        </td>
                                        <td>{req.requested_by_name}</td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {req.notes ? (
                                                <span className="text-muted small fst-italic">"{req.notes}"</span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="text-end">
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleAction(req.id, 'deny')}
                                                disabled={!!processingId}
                                            >
                                                <X size={16} className="me-1" /> Deny
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <Check size={48} className="mb-3 opacity-25" />
                                            <p className="mb-0">No pending requests</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="lab" title={<span><Beaker size={18} className="me-1" /> Lab Services</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 fw-bold">Pending Lab Requests</h5>
                                <Badge bg="warning" text="dark">{labRequests.length} Pending</Badge>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Test Name</th>
                                    <th>Request Type</th>
                                    <th>Details</th>
                                    <th>Requested By</th>
                                    <th>Date</th>
                                    <th>Notes</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {labRequests.map(req => (
                                    <tr key={req.id}>
                                        <td className="fw-medium">{req.test_name || 'N/A'}</td>
                                        <td>
                                            <Badge bg="info">{req.request_type}</Badge>
                                        </td>
                                        <td>
                                            {req.request_type === 'PRICE_CHANGE' && (
                                                <span>New Price: <strong>{formatCurrency(req.new_price)}</strong></span>
                                            )}
                                            {req.request_type === 'NEW_TEST' && (
                                                <span>{req.new_test_name} (Cat: {req.category_id})</span>
                                            )}
                                        </td>
                                        <td>{req.requested_by_name}</td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {req.notes ? (
                                                <span className="text-muted small fst-italic">"{req.notes}"</span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="text-end">
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleLabAction(req.id, 'approve')}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleLabAction(req.id, 'deny')}
                                                disabled={!!processingId}
                                            >
                                                <X size={16} className="me-1" /> Deny
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {labRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <Beaker size={48} className="mb-3 opacity-25" />
                                            <p className="mb-0">No pending lab requests</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="ward" title={<span><Building2 size={18} className="me-1" /> Ward Charges</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 fw-bold">Pending Ward Requests</h5>
                                <Badge bg="warning" text="dark">{wardRequests.length} Pending</Badge>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Item Type</th>
                                    <th>Item Name</th>
                                    <th>Request</th>
                                    <th>Requested By</th>
                                    <th>Date</th>
                                    <th>Notes</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wardRequests.map(req => (
                                    <tr key={req.id}>
                                        <td><Badge bg="secondary">{req.item_type}</Badge></td>
                                        <td className="fw-medium">{req.item_name || req.new_name}</td>
                                        <td>
                                            {req.request_type === 'PRICE_CHANGE' && (
                                                <span>
                                                    <span className="text-muted text-decoration-line-through me-1">{formatCurrency(req.current_price)}</span>
                                                    <ArrowRight size={14} className="mx-1" />
                                                    <strong className="text-primary">{formatCurrency(req.new_price)}</strong>
                                                </span>
                                            )}
                                            {req.request_type === 'NEW_ITEM' && (
                                                <span className="text-success"><Check size={14} /> New: {formatCurrency(req.new_price)}</span>
                                            )}
                                            {req.request_type === 'TOGGLE_STATUS' && (
                                                <span className="text-warning">Toggle Status</span>
                                            )}
                                        </td>
                                        <td>{req.requested_by_name}</td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {req.notes ? (
                                                <span className="text-muted small fst-italic">"{req.notes}"</span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="text-end">
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleWardAction(req.id, 'approve')}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleWardAction(req.id, 'deny')}
                                                disabled={!!processingId}
                                            >
                                                <X size={16} className="me-1" /> Deny
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {wardRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <Building2 size={48} className="mb-3 opacity-25" />
                                            <p className="mb-0">No pending ward requests</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="equipment" title={<span><Zap size={18} className="me-1" /> Equipment</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 fw-bold">Pending Equipment Requests</h5>
                                <Badge bg="warning" text="dark">{equipmentRequests.length} Pending</Badge>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Equipment Name</th>
                                    <th>Action</th>
                                    <th>Rate (24hr)</th>
                                    <th>Category</th>
                                    <th>Requested By</th>
                                    <th>Date</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipmentRequests.map(req => (
                                    <tr key={req.id}>
                                        <td className="fw-medium">{req.name}</td>
                                        <td>{getEquipmentActionBadge(req.action)}</td>
                                        <td className="fw-bold text-success">{formatCurrency(req.rate_per_24hr)}/day</td>
                                        <td><Badge bg="info" className="text-dark bg-opacity-25">{req.category}</Badge></td>
                                        <td>{req.requested_by_name}</td>
                                        <td>{new Date(req.requested_at).toLocaleDateString()}</td>
                                        <td className="text-end">
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleEquipmentAction(req.id, 'approve')}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleEquipmentAction(req.id, 'deny')}
                                                disabled={!!processingId}
                                            >
                                                <X size={16} className="me-1" /> Deny
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {equipmentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <Zap size={48} className="mb-3 opacity-25" />
                                            <p className="mb-0">No pending equipment requests</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>
        </Container>
    );
};

export default PriceApprovals;

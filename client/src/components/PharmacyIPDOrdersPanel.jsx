import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { Pill, CheckCircle, Clock, User, RefreshCw, Package, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * PharmacyIPDOrdersPanel - Shows IPD medication orders from doctors
 * Allows pharmacy to prepare and dispense medications for inpatients
 */
const PharmacyIPDOrdersPanel = ({ onOrderComplete }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(null);

    // Fetch IPD medication orders from care_tasks
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/clinical/tasks', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'Pending' }
            });
            
            // Filter to only show Medication type tasks (from IPD CPOE)
            const allTasks = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const medicationOrders = allTasks.filter(t => t.type === 'Medication');
            
            setOrders(medicationOrders);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch IPD medication orders:', err);
            setError('Failed to load IPD orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Refresh every 30 seconds
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDispense = async (taskId) => {
        try {
            setProcessing(taskId);
            const token = localStorage.getItem('token');
            await api.post('/api/clinical/tasks/complete', 
                { task_id: taskId, notes: 'Dispensed by pharmacy' },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            // Remove from list
            setOrders(orders.filter(o => o.id !== taskId));
            onOrderComplete?.();
        } catch (err) {
            console.error('Failed to mark as dispensed:', err);
            alert('Failed to mark as dispensed. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-muted mt-2 mb-0">Loading IPD medication orders...</p>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="d-flex align-items-center justify-content-between">
                <span>{error}</span>
                <Button variant="outline-danger" size="sm" onClick={fetchOrders}>
                    <RefreshCw size={14} className="me-1" /> Retry
                </Button>
            </Alert>
        );
    }

    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                <span>
                    <Package size={18} className="me-2" />
                    IPD Medication Orders ({orders.length} pending)
                </span>
                <Button variant="light" size="sm" onClick={fetchOrders}>
                    <RefreshCw size={14} className="me-1" /> Refresh
                </Button>
            </Card.Header>
            <Card.Body className="p-0">
                {orders.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <CheckCircle size={32} className="mb-2 text-success" />
                        <p className="mb-0">All IPD orders dispensed!</p>
                    </div>
                ) : (
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Patient</th>
                                <th>Ward / Bed</th>
                                <th>Medication</th>
                                <th>Ordered</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <User size={14} className="me-1 text-muted" />
                                        <strong>{order.patient_name}</strong>
                                    </td>
                                    <td>
                                        <Badge bg="info" className="me-1">{order.ward}</Badge>
                                        <Badge bg="dark">{order.bed_number}</Badge>
                                    </td>
                                    <td>
                                        <div className="fw-bold">
                                            <Pill size={14} className="me-1 text-primary" />
                                            {order.description}
                                        </div>
                                    </td>
                                    <td>
                                        <small className="text-muted">
                                            <Clock size={12} className="me-1" />
                                            {new Date(order.scheduled_time).toLocaleString()}
                                        </small>
                                    </td>
                                    <td>
                                        <Button 
                                            variant="success" 
                                            size="sm"
                                            onClick={() => handleDispense(order.id)}
                                            disabled={processing === order.id}
                                        >
                                            {processing === order.id ? 'Processing...' : (
                                                <><Package size={14} className="me-1" /> Dispense</>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

export default PharmacyIPDOrdersPanel;

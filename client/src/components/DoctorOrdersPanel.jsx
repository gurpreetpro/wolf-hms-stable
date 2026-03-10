import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Alert, Spinner, Table, Tabs, Tab, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Pill, Activity, CheckCircle, Clock, AlertTriangle, User, RefreshCw, Eye, Bell } from 'lucide-react';
import api from '../utils/axiosInstance';
import OrderTrackingTimeline from './OrderTrackingTimeline';

/**
 * DoctorOrdersPanel - Shows medication orders and vital check requests from doctors
 * Displayed in WardDashboard and NurseDashboard for nurses to execute
 * 
 * Phase 2 Enhancement: Order Acknowledgment System
 * - Nurses can acknowledge receipt of orders
 * - Unacknowledged orders show warning after 10 minutes
 */
const DoctorOrdersPanel = ({ wardFilter = 'All', onOrderComplete }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [completing, setCompleting] = useState(null);
    const [acknowledging, setAcknowledging] = useState(null);

    // Fetch doctor orders from care_tasks
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/clinical/tasks', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'Pending' }
            });
            
            // Filter to only show doctor-ordered tasks (Medication, Vital Check types)
            const allTasks = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const doctorOrders = allTasks.filter(t => 
                t.type === 'Medication' || 
                t.type === 'Vital Check' ||
                t.description?.toLowerCase().includes('monitor')
            );
            
            setOrders(doctorOrders);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch doctor orders:', err);
            setError('Failed to load doctor orders');
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

    const handleAcknowledge = async (taskId) => {
        try {
            setAcknowledging(taskId);
            const token = localStorage.getItem('token');
            await api.post('/api/clinical/tasks/acknowledge', 
                { task_id: taskId },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            // Update local state
            setOrders(orders.map(o => 
                o.id === taskId 
                    ? { ...o, acknowledged_at: new Date().toISOString(), acknowledged_by_name: 'You' }
                    : o
            ));
        } catch (err) {
            console.error('Failed to acknowledge order:', err);
            alert('Failed to acknowledge. Please try again.');
        } finally {
            setAcknowledging(null);
        }
    };

    const handleComplete = async (taskId) => {
        try {
            setCompleting(taskId);
            const token = localStorage.getItem('token');
            await api.post('/api/clinical/tasks/complete', 
                { task_id: taskId },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            // Remove from list
            setOrders(orders.filter(o => o.id !== taskId));
            onOrderComplete?.();
        } catch (err) {
            console.error('Failed to complete task:', err);
            alert('Failed to mark as complete. Please try again.');
        } finally {
            setCompleting(null);
        }
    };

    // Check if order is waiting too long without acknowledgment (10 minutes)
    const isOrderUrgent = (order) => {
        if (order.acknowledged_at) return false;
        const createdAt = new Date(order.scheduled_time || order.created_at);
        const now = new Date();
        const diffMinutes = (now - createdAt) / (1000 * 60);
        return diffMinutes > 10;
    };

    // Filter by ward if specified
    const filteredOrders = wardFilter === 'All' 
        ? orders 
        : orders.filter(o => o.ward === wardFilter);

    // Separate by type
    const medOrders = filteredOrders.filter(o => o.type === 'Medication');
    const vitalOrders = filteredOrders.filter(o => o.type === 'Vital Check' || o.description?.toLowerCase().includes('monitor'));
    const unacknowledgedCount = filteredOrders.filter(o => !o.acknowledged_at).length;

    if (loading) {
        return (
            <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-muted mt-2 mb-0">Loading doctor orders...</p>
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

    const renderOrderCard = (order, type) => {
        const isUrgent = isOrderUrgent(order);
        const isAcknowledged = !!order.acknowledged_at;
        
        return (
            <Col md={6} key={order.id}>
                <Card className={`border-start border-4 ${type === 'med' ? 'border-primary' : 'border-success'} shadow-sm h-100 ${isUrgent ? 'bg-warning bg-opacity-10' : ''}`}>
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <div className="fw-bold">
                                    <User size={14} className="me-1 text-muted" />
                                    {order.patient_name}
                                </div>
                                <Badge bg="dark" className="me-1">{order.bed_number}</Badge>
                                <Badge bg="info">{order.ward}</Badge>
                            </div>
                            <div className="text-end">
                                <Badge bg={type === 'med' ? 'primary' : 'success'}>
                                    {type === 'med' ? <><Pill size={12} className="me-1" /> Med</> : <><Activity size={12} className="me-1" /> Vitals</>}
                                </Badge>
                                {isUrgent && (
                                    <OverlayTrigger overlay={<Tooltip>Unacknowledged for 10+ minutes!</Tooltip>}>
                                        <Badge bg="danger" className="ms-1">
                                            <Bell size={12} /> Urgent
                                        </Badge>
                                    </OverlayTrigger>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-2 p-2 bg-light rounded">
                            <strong>{order.description}</strong>
                        </div>

                        {/* Order Tracking Timeline */}
                        <div className="mt-2">
                            <OrderTrackingTimeline order={order} />
                        </div>

                        {/* Acknowledgment Status */}
                        <div className="mt-2 small">
                            {isAcknowledged ? (
                                <span className="text-success">
                                    <Eye size={12} className="me-1" />
                                    Acknowledged by {order.acknowledged_by_name || 'Nurse'}
                                    <span className="text-muted ms-1">
                                        at {new Date(order.acknowledged_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-warning">
                                    <AlertTriangle size={12} className="me-1" />
                                    Not yet acknowledged
                                </span>
                            )}
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <small className="text-muted">
                                <Clock size={12} className="me-1" />
                                {new Date(order.scheduled_time).toLocaleString()}
                            </small>
                            <div className="d-flex gap-2">
                                {!isAcknowledged && (
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        onClick={() => handleAcknowledge(order.id)}
                                        disabled={acknowledging === order.id}
                                    >
                                        {acknowledging === order.id ? '...' : (
                                            <><Eye size={14} className="me-1" /> Acknowledge</>
                                        )}
                                    </Button>
                                )}
                                <Button 
                                    variant="success" 
                                    size="sm"
                                    onClick={() => handleComplete(order.id)}
                                    disabled={completing === order.id}
                                >
                                    {completing === order.id ? 'Completing...' : (
                                        <><CheckCircle size={14} className="me-1" /> {type === 'med' ? 'Administered' : 'Recorded'}</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        );
    };

    return (
        <div>
            {/* Header with Refresh */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                    <AlertTriangle size={20} className="me-2 text-warning" />
                    Doctor Orders ({filteredOrders.length} pending)
                    {unacknowledgedCount > 0 && (
                        <Badge bg="danger" className="ms-2">{unacknowledgedCount} unacknowledged</Badge>
                    )}
                </h5>
                <Button variant="outline-secondary" size="sm" onClick={fetchOrders}>
                    <RefreshCw size={14} className="me-1" /> Refresh
                </Button>
            </div>

            {filteredOrders.length === 0 ? (
                <Alert variant="success" className="text-center">
                    <CheckCircle size={24} className="me-2" />
                    All doctor orders completed! No pending tasks.
                </Alert>
            ) : (
                <Tabs defaultActiveKey="medications" className="mb-3">
                    {/* Medication Orders Tab */}
                    <Tab 
                        eventKey="medications" 
                        title={
                            <span className="d-flex align-items-center gap-2">
                                <Pill size={16} /> Medications
                                {medOrders.length > 0 && <Badge bg="danger">{medOrders.length}</Badge>}
                            </span>
                        }
                    >
                        {medOrders.length === 0 ? (
                            <Card className="border-0 bg-light">
                                <Card.Body className="text-center text-muted py-4">
                                    No pending medication orders
                                </Card.Body>
                            </Card>
                        ) : (
                            <Row className="g-3">
                                {medOrders.map(order => renderOrderCard(order, 'med'))}
                            </Row>
                        )}
                    </Tab>

                    {/* Vital Check Requests Tab */}
                    <Tab 
                        eventKey="vitals" 
                        title={
                            <span className="d-flex align-items-center gap-2">
                                <Activity size={16} /> Vital Checks
                                {vitalOrders.length > 0 && <Badge bg="success">{vitalOrders.length}</Badge>}
                            </span>
                        }
                    >
                        {vitalOrders.length === 0 ? (
                            <Card className="border-0 bg-light">
                                <Card.Body className="text-center text-muted py-4">
                                    No pending vital check requests
                                </Card.Body>
                            </Card>
                        ) : (
                            <Row className="g-3">
                                {vitalOrders.map(order => renderOrderCard(order, 'vital'))}
                            </Row>
                        )}
                    </Tab>
                </Tabs>
            )}
        </div>
    );
};

export default DoctorOrdersPanel;

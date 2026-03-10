import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { Utensils, CheckCircle, Clock, Truck, ChefHat, Filter, RefreshCw } from 'lucide-react';
import api from '../utils/axiosInstance';
import DashboardLayout from '../components/DashboardLayout';

const DietaryDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterMeal, setFilterMeal] = useState('All');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/dietary?status=${filterStatus}&meal_type=${filterMeal}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data.data || res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching dietary orders:', err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterMeal]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await api.put(`/api/dietary/${orderId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status');
            fetchOrders(); // Revert on error
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Ordered': return 'secondary';
            case 'Preparing': return 'warning';
            case 'Ready': return 'success';
            case 'Delivered': return 'primary';
            default: return 'light';
        }
    };

    const FilterBar = () => (
        <Card className="mb-4 shadow-sm border-0">
            <Card.Body className="d-flex flex-wrap gap-3 align-items-end">
                <div className="flex-grow-1">
                    <Form.Label className="fw-bold text-muted small">Status</Form.Label>
                    <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="All">All Statuses</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Ready">Ready for Delivery</option>
                        <option value="Delivered">Delivered</option>
                    </Form.Select>
                </div>
                <div className="flex-grow-1">
                    <Form.Label className="fw-bold text-muted small">Meal Type</Form.Label>
                    <Form.Select value={filterMeal} onChange={e => setFilterMeal(e.target.value)}>
                        <option value="All">All Meals</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                    </Form.Select>
                </div>
                <Button variant="outline-primary" onClick={fetchOrders} title="Refresh">
                    <RefreshCw size={20} className={loading && orders.length > 0 ? 'animate-spin' : ''} />
                </Button>
            </Card.Body>
        </Card>
    );

    const OrderCard = ({ order }) => (
        <Col md={6} lg={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0 border-top border-4" style={{ borderColor: getStatusColor(order.status) }}>
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg={getStatusColor(order.status)} className="px-3 py-2 rounded-pill">
                            {order.status.toUpperCase()}
                        </Badge>
                        <small className="text-muted fw-bold">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                    
                    <h5 className="fw-bold mb-1">{order.ward} - {order.bed_number}</h5>
                    <div className="text-primary mb-2 small fw-bold">{order.patient_name || 'Unknown Patient'}</div>
                    
                    <div className="bg-light p-2 rounded mb-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <Utensils size={16} className="text-muted" /> 
                            <strong>{order.meal_type}</strong> - {order.diet_type}
                        </div>
                        {order.allergies && (
                            <div className="text-danger small fw-bold">
                                ⚠️ Allergies: {order.allergies}
                            </div>
                        )}
                        {order.notes && (
                            <div className="text-muted small fst-italic mt-1">
                                "{order.notes}"
                            </div>
                        )}
                    </div>

                    <div className="d-grid gap-2">
                        {order.status === 'Ordered' && (
                            <Button variant="warning" onClick={() => updateStatus(order.id, 'Preparing')}>
                                <ChefHat size={18} className="me-2" /> Start Preparing
                            </Button>
                        )}
                        {order.status === 'Preparing' && (
                            <Button variant="success" onClick={() => updateStatus(order.id, 'Ready')}>
                                <CheckCircle size={18} className="me-2" /> Mark Ready
                            </Button>
                        )}
                        {order.status === 'Ready' && (
                            <Button variant="primary" onClick={() => updateStatus(order.id, 'Delivered')}>
                                <Truck size={18} className="me-2" /> Mark Delivered
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold"><Utensils className="me-2 text-warning" /> Dietary Management</h2>
                    <p className="text-muted mb-0">Kitchen & Canteen Orders Overview</p>
                </div>
                <div className="text-end">
                    <small className="text-muted d-block">Last Updated: {lastUpdated.toLocaleTimeString()}</small>
                </div>
            </div>

            <FilterBar />

            {loading && orders.length === 0 ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : orders.length === 0 ? (
                <Alert variant="info" className="text-center py-5">
                    <Utensils size={48} className="mb-3 opacity-50" />
                    <h4>No active orders found.</h4>
                    <p>Current filters matched 0 records.</p>
                </Alert>
            ) : (
                <Row>
                    {orders.map(order => <OrderCard key={order.id} order={order} />)}
                </Row>
            )}
        </Container>
    );
};

export default DietaryDashboard;
